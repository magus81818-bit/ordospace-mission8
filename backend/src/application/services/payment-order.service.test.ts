import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createPaymentOrderService } from "./payment-order.service.js";
import { IPaymentOrderRepo } from "../contracts/payment-order-repo.contract.js";
import { IPaymentGateway } from "../contracts/payment-gateway.contract.js";
import { PaymentOrder } from "../../generated/prisma/client.js";
import { PROJECT_KICKOFF } from "../domain/payment-product-catalog.js";

const baseOrder = (over: Partial<PaymentOrder> = {}): PaymentOrder =>
  ({
    id: 1,
    orderId: "order-abc",
    idempotencyKey: "idem-1",
    userId: 3,
    projectId: 1,
    productCode: PROJECT_KICKOFF.code,
    orderName: PROJECT_KICKOFF.orderName,
    amount: PROJECT_KICKOFF.amount,
    currency: "KRW",
    status: "PENDING",
    paymentKey: null,
    failureCode: null,
    failureMessage: null,
    approvedAt: null,
    canceledAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as PaymentOrder;

const build = () => {
  const repo: jest.Mocked<IPaymentOrderRepo> = {
    create: jest.fn(),
    findByOrderId: jest.fn(),
    findByUserIdempotency: jest.fn(),
    findByPaymentKey: jest.fn(),
    markConfirming: jest.fn(),
    markPaid: jest.fn(),
    markFailed: jest.fn(),
    markCanceledOrFailed: jest.fn(),
    updateProjectPaymentStatus: jest.fn(),
    findProjectById: jest.fn(),
  };

  const gateway: jest.Mocked<IPaymentGateway> = {
    confirm: jest.fn(),
  };

  repo.findProjectById.mockResolvedValue({
    id: 1,
    clientId: 3,
    paymentStatus: "UNPAID",
  });

  const svc = createPaymentOrderService(repo, gateway);
  return { svc, repo, gateway };
};

describe("PaymentOrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("CLIENT가 본인 프로젝트 주문을 생성하면 catalog 금액으로 PENDING 주문이 생긴다", async () => {
    const { svc, repo } = build();
    repo.findByUserIdempotency.mockResolvedValue(null);
    repo.create.mockResolvedValue(baseOrder());

    const order = await svc.createOrder({
      userId: 3,
      role: "CLIENT",
      projectId: 1,
      idempotencyKey: "idem-1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 49000,
        productCode: "PROJECT_KICKOFF",
        userId: 3,
        projectId: 1,
      }),
    );
    expect(order.status).toBe("PENDING");
    expect(order).not.toHaveProperty("paymentKey");
  });

  it("ADMIN은 주문 생성을 거부한다", async () => {
    const { svc } = build();
    await expect(
      svc.createOrder({
        userId: 1,
        role: "ADMIN",
        projectId: 1,
        idempotencyKey: "k",
      }),
    ).rejects.toThrow("CLIENT만");
  });

  it("WORKER는 주문 생성을 거부한다", async () => {
    const { svc } = build();
    await expect(
      svc.createOrder({
        userId: 2,
        role: "WORKER",
        projectId: 1,
        idempotencyKey: "k",
      }),
    ).rejects.toThrow("CLIENT만");
  });

  it("다른 CLIENT 프로젝트 주문 생성을 거부한다", async () => {
    const { svc, repo } = build();
    repo.findProjectById.mockResolvedValue({ id: 1, clientId: 99, paymentStatus: "UNPAID" });
    await expect(
      svc.createOrder({
        userId: 3,
        role: "CLIENT",
        projectId: 1,
        idempotencyKey: "k",
      }),
    ).rejects.toThrow("본인 프로젝트");
  });

  it("동일 idempotency key면 기존 주문을 반환한다", async () => {
    const { svc, repo } = build();
    repo.findByUserIdempotency.mockResolvedValue(baseOrder({ orderId: "same" }));
    const order = await svc.createOrder({
      userId: 3,
      role: "CLIENT",
      projectId: 1,
      idempotencyKey: "idem-1",
    });
    expect(repo.create).not.toHaveBeenCalled();
    expect(order.orderId).toBe("same");
  });

  it("PAID 프로젝트는 새 주문 생성을 거부한다", async () => {
    const { svc, repo } = build();
    repo.findProjectById.mockResolvedValue({ id: 1, clientId: 3, paymentStatus: "PAID" });
    await expect(
      svc.createOrder({
        userId: 3,
        role: "CLIENT",
        projectId: 1,
        idempotencyKey: "k",
      }),
    ).rejects.toThrow("이미 킥오프");
  });

  it("정상 confirm 시 PAID로 전환하고 프로젝트 상태를 갱신한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder());
    repo.findByPaymentKey.mockResolvedValue(null);
    repo.markConfirming.mockResolvedValue(baseOrder({ status: "CONFIRMING" }));
    gateway.confirm.mockResolvedValue({
      paymentKey: "pk_test",
      orderId: "order-abc",
      status: "DONE",
      approvedAt: "2026-07-31T00:00:00Z",
      totalAmount: 49000,
    });
    repo.markPaid.mockResolvedValue(
      baseOrder({ status: "PAID", paymentKey: "pk_test" }),
    );

    const order = await svc.confirmOrder({
      userId: 3,
      role: "CLIENT",
      orderId: "order-abc",
      paymentKey: "pk_test",
      amount: 49000,
    });

    expect(gateway.confirm).toHaveBeenCalledTimes(1);
    expect(repo.markPaid).toHaveBeenCalled();
    expect(repo.updateProjectPaymentStatus).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: "PAID" }),
    );
    expect(order.status).toBe("PAID");
  });

  it("amount mismatch는 gateway 호출 전에 거부한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder());
    await expect(
      svc.confirmOrder({
        userId: 3,
        role: "CLIENT",
        orderId: "order-abc",
        paymentKey: "pk_test",
        amount: 1,
      }),
    ).rejects.toThrow("금액");
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it("다른 사용자 주문 confirm을 거부한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder({ userId: 3 }));
    await expect(
      svc.confirmOrder({
        userId: 99,
        role: "CLIENT",
        orderId: "order-abc",
        paymentKey: "pk_test",
        amount: 49000,
      }),
    ).rejects.toThrow("존재하지 않는 주문");
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it("paymentKey 중복 사용을 거부한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder());
    repo.findByPaymentKey.mockResolvedValue(baseOrder({ orderId: "other-order" }));
    await expect(
      svc.confirmOrder({
        userId: 3,
        role: "CLIENT",
        orderId: "order-abc",
        paymentKey: "pk_test",
        amount: 49000,
      }),
    ).rejects.toThrow("이미 사용된");
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it("PAID 주문 동일 confirm은 멱등 성공한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(
      baseOrder({ status: "PAID", paymentKey: "pk_test" }),
    );
    const order = await svc.confirmOrder({
      userId: 3,
      role: "CLIENT",
      orderId: "order-abc",
      paymentKey: "pk_test",
      amount: 49000,
    });
    expect(gateway.confirm).not.toHaveBeenCalled();
    expect(order.status).toBe("PAID");
  });

  it("PAID 주문에 다른 paymentKey confirm은 conflict", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(
      baseOrder({ status: "PAID", paymentKey: "pk_old" }),
    );
    await expect(
      svc.confirmOrder({
        userId: 3,
        role: "CLIENT",
        orderId: "order-abc",
        paymentKey: "pk_new",
        amount: 49000,
      }),
    ).rejects.toThrow("이미 다른");
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it("gateway 실패 시 FAILED로 기록한다", async () => {
    const { svc, repo, gateway } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder());
    repo.findByPaymentKey.mockResolvedValue(null);
    repo.markConfirming.mockResolvedValue(baseOrder({ status: "CONFIRMING" }));
    gateway.confirm.mockRejectedValue(new Error("network"));

    await expect(
      svc.confirmOrder({
        userId: 3,
        role: "CLIENT",
        orderId: "order-abc",
        paymentKey: "pk_test",
        amount: 49000,
      }),
    ).rejects.toThrow();
  });

  it("PAY_PROCESS_CANCELED는 CANCELED로 기록한다", async () => {
    const { svc, repo } = build();
    repo.findByOrderId.mockResolvedValue(baseOrder());
    repo.markCanceledOrFailed.mockResolvedValue(
      baseOrder({ status: "CANCELED" }),
    );
    const order = await svc.reportFailure({
      userId: 3,
      role: "CLIENT",
      orderId: "order-abc",
      code: "PAY_PROCESS_CANCELED",
    });
    expect(repo.markCanceledOrFailed).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CANCELED" }),
    );
    expect(order.status).toBe("CANCELED");
  });
});
