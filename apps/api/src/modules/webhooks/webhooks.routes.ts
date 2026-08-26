import type { Request } from "express";
import { Router } from "express";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { handleWebhookNotification } from "../payments/payments.service";
import { isValidMercadoPagoSignature } from "./mercadopago-signature";
import { isValidBlingWebhookSignature } from "../bling/bling-signature";
import { ingestBlingOrder } from "../bling/bling-orders.service";

export const webhooksRouter = Router();

function rawBodyOf(req: Request): Buffer {
  // Populated by the express.json({ verify }) hook in app.ts — the Bling signature is HMAC'd over
  // the exact request bytes, not a re-serialization of the parsed object.
  return (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
}

webhooksRouter.post(
  "/mercadopago",
  asyncHandler(async (req, res) => {
    const { type, data } = req.body as { type?: string; data?: { id?: string } };
    const paymentId = data?.id ?? (req.query["data.id"] as string | undefined);

    if (type === "payment" && paymentId) {
      if (!isValidMercadoPagoSignature(req, String(paymentId))) {
        console.warn(`Webhook do Mercado Pago rejeitado: assinatura inválida (paymentId=${paymentId}).`);
        throw new HttpError(401, "Assinatura do webhook inválida.");
      }
      await handleWebhookNotification(String(paymentId));
    }

    // Mercado Pago expects a 200/201 quickly regardless of processing outcome.
    res.status(200).json({ received: true });
  }),
);

webhooksRouter.post(
  "/bling",
  asyncHandler(async (req, res) => {
    if (!isValidBlingWebhookSignature(req, rawBodyOf(req))) {
      console.warn("Webhook do Bling rejeitado: assinatura inválida.");
      throw new HttpError(401, "Assinatura do webhook inválida.");
    }

    // Payload shape: { eventId, date, version, event: "order.created" | "order.updated" | ..., data }.
    // Re-check `data`'s exact shape once the app is connected — treating it as either the order id
    // itself or an object carrying one covers the documented "resource.action" pattern either way.
    const { event, data } = req.body as { event?: string; data?: { id?: number | string } };
    if (event?.startsWith("order.")) {
      const orderId = data?.id;
      if (orderId) {
        try {
          await ingestBlingOrder(String(orderId));
        } catch (err) {
          console.error(`Falha ao importar pedido Bling ${orderId}:`, err);
        }
      }
    }

    // Bling expects a fast 2xx regardless of downstream processing outcome, or it retries for 3 days.
    res.status(200).json({ received: true });
  }),
);
