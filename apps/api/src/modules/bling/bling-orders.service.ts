import { fetchBlingOrderDetail, fetchBlingOrderIds } from "./bling.client";
import { createMarketplaceOrder } from "../orders/orders.service";

export async function ingestBlingOrder(orderId: string) {
  const normalized = await fetchBlingOrderDetail(orderId);
  return createMarketplaceOrder(normalized);
}

export interface ImportBlingOrdersResult {
  found: number;
  imported: number;
  alreadyExisted: number;
  failed: Array<{ externalOrderId: string; error: string }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One request every ~350ms stays comfortably under Bling's per-app rate limit for this bulk backfill
// (the live webhook path ingests one order at a time and doesn't need this).
const IMPORT_REQUEST_INTERVAL_MS = 350;

/** One-time backfill for orders placed in Bling before the webhook was wired up. Safe to re-run —
 * createMarketplaceOrder is idempotent per (channel, externalOrderId). */
export async function importHistoricalBlingOrders(sinceDate: string): Promise<ImportBlingOrdersResult> {
  const ids = await fetchBlingOrderIds(sinceDate);
  const result: ImportBlingOrdersResult = { found: ids.length, imported: 0, alreadyExisted: 0, failed: [] };

  for (const id of ids) {
    try {
      const { created } = await ingestBlingOrder(id);
      if (created) result.imported++;
      else result.alreadyExisted++;
    } catch (err) {
      result.failed.push({ externalOrderId: id, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(IMPORT_REQUEST_INTERVAL_MS);
  }

  return result;
}
