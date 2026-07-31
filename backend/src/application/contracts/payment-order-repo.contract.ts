import {
  PaymentOrder,
  PaymentOrderStatus,
  ProjectPaymentStatus,
} from "../../generated/prisma/client.js";

export type ProjectSummary = {
  id: number;
  clientId: number;
  paymentStatus: ProjectPaymentStatus;
};

export type CreatePaymentOrderInput = {
  orderId: string;
  idempotencyKey: string;
  userId: number;
  projectId: number;
  productCode: string;
  orderName: string;
  amount: number;
  currency: string;
};

export type PaymentOrderPublic = Omit<PaymentOrder, "paymentKey"> & {
  paymentKey?: never;
};

export interface IPaymentOrderRepo {
  create: (input: CreatePaymentOrderInput) => Promise<PaymentOrder>;
  findByOrderId: (orderId: string) => Promise<PaymentOrder | null>;
  findByUserIdempotency: (
    userId: number,
    idempotencyKey: string,
  ) => Promise<PaymentOrder | null>;
  findByPaymentKey: (paymentKey: string) => Promise<PaymentOrder | null>;
  markConfirming: (
    orderId: string,
    expectedStatus: PaymentOrderStatus,
  ) => Promise<PaymentOrder | null>;
  markPaid: (params: {
    orderId: string;
    paymentKey: string;
    approvedAt: Date;
  }) => Promise<PaymentOrder>;
  markFailed: (params: {
    orderId: string;
    failureCode?: string;
    failureMessage?: string;
  }) => Promise<PaymentOrder>;
  markCanceledOrFailed: (params: {
    orderId: string;
    status: "CANCELED" | "FAILED";
    failureCode?: string;
    failureMessage?: string;
  }) => Promise<PaymentOrder>;
  updateProjectPaymentStatus: (params: {
    projectId: number;
    paymentStatus: ProjectPaymentStatus;
    kickoffPaidAt?: Date | null;
  }) => Promise<void>;
  findProjectById: (projectId: number) => Promise<ProjectSummary | null>;
}
