import crypto from "node:crypto";
import type { Request } from "express";
import { env } from "../../config/env";

/**
 * Bling webhook authenticity check.
 * Header `X-Bling-Signature-256` = "sha256=" + HMAC-SHA256(client_secret, raw_body), hex-encoded.
 * https://developer.bling.com.br/webhooks
 */
export function isValidBlingWebhookSignature(req: Request, rawBody: Buffer | string): boolean {
  const secret = env.bling.clientSecret;
  if (!secret) {
    console.warn("BLING_CLIENT_SECRET não configurado; pulando validação do webhook Bling.");
    return true;
  }

  const header = req.headers["x-bling-signature-256"];
  if (typeof header !== "string" || !header.startsWith("sha256=")) {
    return false;
  }
  const received = header.slice("sha256=".length);

  const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(bodyString).digest("hex");

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
