import crypto from "node:crypto";
import type { Request } from "express";
import { env } from "../../config/env";

// https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks#Validando-a-origem-da-notificação
export function isValidMercadoPagoSignature(req: Request, dataId: string): boolean {
  const secret = env.mercadoPago.webhookSecret;
  if (!secret) {
    // No secret configured (e.g. local/sandbox setup that hasn't set one up yet) — skip enforcement.
    console.warn("MERCADOPAGO_WEBHOOK_SECRET não configurado; pulando validação de assinatura do webhook.");
    return true;
  }

  const signatureHeader = req.headers["x-signature"];
  const requestId = req.headers["x-request-id"];
  if (typeof signatureHeader !== "string" || typeof requestId !== "string") {
    return false;
  }

  const parts: Record<string, string> = {};
  for (const piece of signatureHeader.split(",")) {
    const [key, value] = piece.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }
  const ts = parts.ts;
  const receivedHash = parts.v1;
  if (!ts || !receivedHash) {
    return false;
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  const receivedBuffer = Buffer.from(receivedHash);
  const expectedBuffer = Buffer.from(expectedHash);
  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
