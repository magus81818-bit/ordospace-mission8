import { PaymentOrderStatus } from "../../generated/prisma/client.js";

const ALLOWED: Record<PaymentOrderStatus, PaymentOrderStatus[]> = {
  PENDING: ["CONFIRMING", "CANCELED", "EXPIRED"],
  CONFIRMING: ["PAID", "FAILED"],
  PAID: [],
  FAILED: ["CONFIRMING"],
  CANCELED: [],
  EXPIRED: [],
};

// 허용된 상태 전이인지 검사
export const canTransition = (
  from: PaymentOrderStatus,
  to: PaymentOrderStatus,
): boolean => ALLOWED[from]?.includes(to) ?? false;

export const isTerminalStatus = (status: PaymentOrderStatus): boolean =>
  status === "PAID" || status === "CANCELED" || status === "EXPIRED";
