import { prismaClient } from "./prismaClient.js";
import {
  CreatePaymentOrderInput,
  IPaymentOrderRepo,
} from "../../application/contracts/payment-order-repo.contract.js";
import {
  PaymentOrderStatus,
  ProjectPaymentStatus,
} from "../../generated/prisma/client.js";

export const createPaymentOrderRepo = (): IPaymentOrderRepo => {
  const create = (input: CreatePaymentOrderInput) =>
    prismaClient.paymentOrder.create({ data: input });

  const findByOrderId = (orderId: string) =>
    prismaClient.paymentOrder.findUnique({ where: { orderId } });

  const findByUserIdempotency = (userId: number, idempotencyKey: string) =>
    prismaClient.paymentOrder.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
    });

  const findByPaymentKey = (paymentKey: string) =>
    prismaClient.paymentOrder.findUnique({ where: { paymentKey } });

  // PENDING 상태만 CONFIRMING으로 선점
  const markConfirming = async (
    orderId: string,
    expectedStatus: PaymentOrderStatus,
  ) => {
    const updated = await prismaClient.paymentOrder.updateMany({
      where: { orderId, status: expectedStatus },
      data: { status: "CONFIRMING" },
    });
    if (updated.count !== 1) return null;
    return findByOrderId(orderId);
  };

  const markPaid = async (params: {
    orderId: string;
    paymentKey: string;
    approvedAt: Date;
  }) =>
    prismaClient.paymentOrder.update({
      where: { orderId: params.orderId },
      data: {
        status: "PAID",
        paymentKey: params.paymentKey,
        approvedAt: params.approvedAt,
      },
    });

  const markFailed = (params: {
    orderId: string;
    failureCode?: string;
    failureMessage?: string;
  }) =>
    prismaClient.paymentOrder.update({
      where: { orderId: params.orderId },
      data: {
        status: "FAILED",
        failureCode: params.failureCode ?? null,
        failureMessage: params.failureMessage ?? null,
      },
    });

  const markCanceledOrFailed = (params: {
    orderId: string;
    status: "CANCELED" | "FAILED";
    failureCode?: string;
    failureMessage?: string;
  }) =>
    prismaClient.paymentOrder.update({
      where: { orderId: params.orderId },
      data: {
        status: params.status,
        failureCode: params.failureCode ?? null,
        failureMessage: params.failureMessage ?? null,
        canceledAt: params.status === "CANCELED" ? new Date() : undefined,
      },
    });

  const updateProjectPaymentStatus = async (params: {
    projectId: number;
    paymentStatus: ProjectPaymentStatus;
    kickoffPaidAt?: Date | null;
  }) => {
    await prismaClient.project.update({
      where: { id: params.projectId },
      data: {
        paymentStatus: params.paymentStatus,
        kickoffPaidAt: params.kickoffPaidAt,
      },
    });
  };

  const findProjectById = async (projectId: number) => {
    const project = await prismaClient.project.findUnique({
      where: { id: projectId },
      select: { id: true, clientId: true, paymentStatus: true },
    });
    return project;
  };

  return {
    create,
    findByOrderId,
    findByUserIdempotency,
    findByPaymentKey,
    markConfirming,
    markPaid,
    markFailed,
    markCanceledOrFailed,
    updateProjectPaymentStatus,
    findProjectById,
  };
};
