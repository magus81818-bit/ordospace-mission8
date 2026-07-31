import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  projectId: z.number().int().positive(),
  idempotencyKey: z.string().min(8).max(128),
});

export const confirmPaymentOrderSchema = z.object({
  paymentKey: z.string().min(8).max(200),
  amount: z.number().int().positive(),
});

export const failPaymentOrderSchema = z.object({
  code: z.string().min(1).max(100),
  message: z.string().max(200).optional(),
});
