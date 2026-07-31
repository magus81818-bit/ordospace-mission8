import { Router, Request, Response } from "express";
import { PaymentOrderServiceType } from "../../application/services/payment-order.service.js";
import { AuthMiddlewareType } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import {
  confirmPaymentOrderSchema,
  createPaymentOrderSchema,
  failPaymentOrderSchema,
} from "../schemas/payment-order.schemas.js";
import { BusinessException } from "../../shared/exceptions/business.exception.js";
import { Role } from "../../generated/prisma/client.js";
import z from "zod";

export const createPaymentOrderController = (
  svc: PaymentOrderServiceType,
  authMiddleware: AuthMiddlewareType,
) => {
  const router = Router();

  router.post(
    "/",
    authMiddleware,
    requireRole("CLIENT"),
    async (req: Request, res: Response) => {
      const parsed = createPaymentOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BusinessException(z.prettifyError(parsed.error));
      }
      const order = await svc.createOrder({
        userId: req.userId!,
        role: req.role as Role,
        ...parsed.data,
      });
      res.status(201).json({ order });
    },
  );

  router.get(
    "/:orderId",
    authMiddleware,
    requireRole("CLIENT"),
    async (req: Request, res: Response) => {
      const order = await svc.getOrder({
        userId: req.userId!,
        role: req.role as Role,
        orderId: String(req.params.orderId),
      });
      res.json({ order });
    },
  );

  router.post(
    "/:orderId/confirm",
    authMiddleware,
    requireRole("CLIENT"),
    async (req: Request, res: Response) => {
      const parsed = confirmPaymentOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BusinessException(z.prettifyError(parsed.error));
      }
      const order = await svc.confirmOrder({
        userId: req.userId!,
        role: req.role as Role,
        orderId: String(req.params.orderId),
        ...parsed.data,
      });
      res.json({ order });
    },
  );

  router.post(
    "/:orderId/fail",
    authMiddleware,
    requireRole("CLIENT"),
    async (req: Request, res: Response) => {
      const parsed = failPaymentOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BusinessException(z.prettifyError(parsed.error));
      }
      const order = await svc.reportFailure({
        userId: req.userId!,
        role: req.role as Role,
        orderId: String(req.params.orderId),
        ...parsed.data,
      });
      res.json({ order });
    },
  );

  return { router };
};

export const createPaymentsConfigRouter = (svc: PaymentOrderServiceType) => {
  const router = Router();
  router.get("/config", (_req: Request, res: Response) => {
    res.json(svc.getConfig());
  });
  return { router };
};
