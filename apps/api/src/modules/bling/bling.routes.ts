import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { getBlingAuthorizeUrl, handleBlingCallback } from "./bling-oauth.service";
import { importHistoricalBlingOrders } from "./bling-orders.service";

export const blingRouter = Router();

const DEFAULT_IMPORT_LOOKBACK_DAYS = 90;

function defaultSinceDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - DEFAULT_IMPORT_LOOKBACK_DAYS);
  return date.toISOString().slice(0, 10);
}

// Kicks off the one-time OAuth grant — visited as a plain browser navigation (not an XHR/fetch),
// so there's no JWT bearer header to check here; requireAuth doesn't apply to this hop. The real
// gate is Bling's own login screen next, and the signed `state` checked at /callback below.
blingRouter.get(
  "/authorize",
  asyncHandler(async (_req, res) => {
    res.redirect(getBlingAuthorizeUrl());
  }),
);

// Bling redirects the browser here after the admin approves — no session cookie/JWT travels with
// it, so this relies on the signed `state` param instead of requireAuth for CSRF protection.
blingRouter.get(
  "/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code) {
      res.redirect(`${env.webOrigin}/admin/configuracoes?bling=error`);
      return;
    }
    try {
      await handleBlingCallback(code, state);
      res.redirect(`${env.webOrigin}/admin/configuracoes?bling=connected`);
    } catch (error) {
      console.error("Bling OAuth callback failed", error);
      res.redirect(`${env.webOrigin}/admin/configuracoes?bling=error`);
    }
  }),
);

const importOrdersSchema = z.object({
  // YYYY-MM-DD. Defaults to 90 days back — Bling orders older than that need a wider one-off call.
  sinceDate: z.string().min(1).optional(),
});

blingRouter.post(
  "/import-orders",
  requireAuth,
  requireRole("admin"),
  validateBody(importOrdersSchema),
  asyncHandler(async (req, res) => {
    const sinceDate = req.body.sinceDate ?? defaultSinceDate();
    const result = await importHistoricalBlingOrders(sinceDate);
    res.json(result);
  }),
);
