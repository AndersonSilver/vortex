import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { handleWebhookNotification } from "../payments/payments.service";

export const webhooksRouter = Router();

webhooksRouter.post(
  "/mercadopago",
  asyncHandler(async (req, res) => {
    const { type, data } = req.body as { type?: string; data?: { id?: string } };
    const paymentId = data?.id ?? (req.query["data.id"] as string | undefined);

    if (type === "payment" && paymentId) {
      await handleWebhookNotification(String(paymentId));
    }

    // Mercado Pago expects a 200/201 quickly regardless of processing outcome.
    res.status(200).json({ received: true });
  }),
);
