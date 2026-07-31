export type ConfirmPaymentInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type ConfirmPaymentResult = {
  paymentKey: string;
  orderId: string;
  status: string;
  approvedAt: string | null;
  method?: string | null;
  totalAmount: number;
};

export interface IPaymentGateway {
  confirm: (input: ConfirmPaymentInput) => Promise<ConfirmPaymentResult>;
}
