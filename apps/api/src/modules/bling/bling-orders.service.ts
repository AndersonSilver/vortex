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
  }

  return result;
}
