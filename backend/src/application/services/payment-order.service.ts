import { randomUUID } from "node:crypto";
import { IPaymentOrderRepo } from "../contracts/payment-order-repo.contract.js";
import { IPaymentGateway } from "../contracts/payment-gateway.contract.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { Role, PaymentOrder } from "../../generated/prisma/client.js";
import { PROJECT_KICKOFF } from "../domain/payment-product-catalog.js";
import { getPublicPaymentConfig } from "../../shared/config/payment.config.js";

const sanitizeMessage = (message?: string, max = 200) =>
  (message ?? "").slice(0, max);

const toPublicOrder = (order: PaymentOrder) => {
  const { paymentKey: _pk, ...rest } = order;
  return rest;
};

export const createPaymentOrderService = (
  repo: IPaymentOrderRepo,
  gateway: IPaymentGateway,
) => {
  // CLIENT 역할과 프로젝트 소유권 검증
  const assertClientOwner = async (userId: number, role: Role, projectId: number) => {
    if (role !== "CLIENT") {
      throw new BusinessException("CLIENT만 결제 주문을 생성할 수 있습니다");
    }
    const project = await repo.findProjectById(projectId);
    if (!project) throw new BusinessException("존재하지 않는 프로젝트입니다");
    if (project.clientId !== userId) {
      throw new BusinessException("본인 프로젝트만 결제할 수 있습니다");
    }
    return project;
  };

  const getConfig = () => getPublicPaymentConfig();

  const createOrder = async (params: {
    userId: number;
    role: Role;
    projectId: number;
    idempotencyKey: string;
  }) => {
    const project = await assertClientOwner(
      params.userId,
      params.role,
      params.projectId,
    );

    if (project.paymentStatus === "PAID") {
      throw new BusinessException("이미 킥오프 결제가 완료된 프로젝트입니다");
    }

    const existing = await repo.findByUserIdempotency(
      params.userId,
      params.idempotencyKey,
    );
    if (existing) return toPublicOrder(existing);

    const order = await repo.create({
      orderId: randomUUID().replace(/-/g, ""),
      idempotencyKey: params.idempotencyKey,
      userId: params.userId,
      projectId: params.projectId,
      productCode: PROJECT_KICKOFF.code,
      orderName: PROJECT_KICKOFF.orderName,
      amount: PROJECT_KICKOFF.amount,
      currency: PROJECT_KICKOFF.currency,
    });

    await repo.updateProjectPaymentStatus({
      projectId: params.projectId,
      paymentStatus: "PENDING",
    });

    return toPublicOrder(order);
  };

  const getOrder = async (params: {
    userId: number;
    role: Role;
    orderId: string;
  }) => {
    if (params.role !== "CLIENT") {
      throw new BusinessException("주문을 조회할 권한이 없습니다");
    }
    const order = await repo.findByOrderId(params.orderId);
    if (!order || order.userId !== params.userId) {
      throw new BusinessException("존재하지 않는 주문입니다");
    }
    return toPublicOrder(order);
  };

  const confirmOrder = async (params: {
    userId: number;
    role: Role;
    orderId: string;
    paymentKey: string;
    amount: number;
  }) => {
    if (params.role !== "CLIENT") {
      throw new BusinessException("결제를 승인할 권한이 없습니다");
    }

    const order = await repo.findByOrderId(params.orderId);
    if (!order || order.userId !== params.userId) {
      throw new BusinessException("존재하지 않는 주문입니다");
    }

    await assertClientOwner(params.userId, params.role, order.projectId);

    // PAID 멱등 처리
    if (order.status === "PAID") {
      if (
        order.paymentKey === params.paymentKey &&
        order.amount === params.amount
      ) {
        return toPublicOrder(order);
      }
      throw new BusinessException("이미 다른 방식으로 승인된 주문입니다");
    }

    if (order.amount !== params.amount) {
      throw new BusinessException("결제 금액이 주문과 일치하지 않습니다");
    }

    const keyOwner = await repo.findByPaymentKey(params.paymentKey);
    if (keyOwner && keyOwner.orderId !== params.orderId) {
      throw new BusinessException("이미 사용된 결제 키입니다");
    }

    const claimable =
      order.status === "PENDING" || order.status === "FAILED"
        ? order.status
        : null;
    if (!claimable) {
      throw new BusinessException("현재 상태에서는 승인할 수 없습니다");
    }

    const claimed = await repo.markConfirming(params.orderId, claimable);
    if (!claimed) {
      throw new BusinessException("다른 승인 요청이 처리 중입니다");
    }

    try {
      const result = await gateway.confirm({
        paymentKey: params.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
      });

      if (result.orderId !== params.orderId || result.totalAmount !== params.amount) {
        await repo.markFailed({
          orderId: params.orderId,
          failureCode: "GATEWAY_MISMATCH",
          failureMessage: "승인 응답이 주문과 일치하지 않습니다",
        });
        throw new BusinessException("결제 승인 응답을 확인할 수 없습니다");
      }

      const approvedAt = result.approvedAt
        ? new Date(result.approvedAt)
        : new Date();

      const paid = await repo.markPaid({
        orderId: params.orderId,
        paymentKey: params.paymentKey,
        approvedAt,
      });

      await repo.updateProjectPaymentStatus({
        projectId: order.projectId,
        paymentStatus: "PAID",
        kickoffPaidAt: approvedAt,
      });

      return toPublicOrder(paid);
    } catch (err) {
      if (err instanceof BusinessException) {
        await repo.markFailed({
          orderId: params.orderId,
          failureMessage: sanitizeMessage(err.message),
        });
      }
      throw err;
    }
  };

  const reportFailure = async (params: {
    userId: number;
    role: Role;
    orderId: string;
    code: string;
    message?: string;
  }) => {
    if (params.role !== "CLIENT") {
      throw new BusinessException("실패를 기록할 권한이 없습니다");
    }
    const order = await repo.findByOrderId(params.orderId);
    if (!order || order.userId !== params.userId) {
      throw new BusinessException("존재하지 않는 주문입니다");
    }
    if (order.status === "PAID") {
      return toPublicOrder(order);
    }

    const status = params.code === "PAY_PROCESS_CANCELED" ? "CANCELED" : "FAILED";
    const updated = await repo.markCanceledOrFailed({
      orderId: params.orderId,
      status,
      failureCode: params.code,
      failureMessage: sanitizeMessage(params.message),
    });

    if (status === "CANCELED" || status === "FAILED") {
      await repo.updateProjectPaymentStatus({
        projectId: order.projectId,
        paymentStatus: "UNPAID",
      });
    }

    return toPublicOrder(updated);
  };

  return { getConfig, createOrder, getOrder, confirmOrder, reportFailure };
};

export type PaymentOrderServiceType = ReturnType<typeof createPaymentOrderService>;
