import { Router } from "express";
import { createPaymentSchema } from "@vortex/shared";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { createPaymentForOrder } from "./payments.service";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.post(
  "/orders/:orderId",
  validateBody(createPaymentSchema),
  asyncHandler(async (req, res) => {
    const result = await createPaymentForOrder(req.auth!.userId, req.params.orderId, req.body);
    res.status(201).json(result);
  }),
);
