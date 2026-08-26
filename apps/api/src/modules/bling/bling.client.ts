import axios from "axios";
import { env } from "../../config/env";
import { ensureFreshBlingAccessToken } from "./bling-oauth.service";
import type { BlingOrderItem, NormalizedBlingOrder } from "./bling-order.types";

// Bling API v3 "Pedido de venda" response shape (subset used here), verified against a live
// GET /pedidos/vendas/{id} response on 2026-08-26. `contato` never carried telefone/celular in
// that sample — customerPhone ends up null for Bling orders until proven otherwise.
interface BlingOrderDetail {
  id: number;
  contato?: { nome?: string };
  // Root CNPJ (first 8 digits) identifies which marketplace facilitated the sale — see
  // MARKETPLACE_CNPJ_ROOTS below. Shopee/TikTok/Mercado Livre all route through Bling this way.
  intermediador?: { cnpj?: string };
  desconto?: { valor?: number };
  itens: Array<{ codigo: string; descricao: string; quantidade: number; valor: number }>;
  transporte?: {
    frete?: number;
    etiqueta?: {
      endereco?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cep?: string;
      municipio?: string;
      uf?: string;
    };
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RATE_LIMIT_MAX_RETRIES = 3;

async function blingGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const accessToken = await ensureFreshBlingAccessToken();
  for (let attempt = 0; ; attempt++) {
    try {
      const { data } = await axios.get<T>(`${env.bling.baseUrl}${path}`, {
        timeout: 8000,
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        params,
      });
      return data;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status !== 429 || attempt >= RATE_LIMIT_MAX_RETRIES) throw err;
      // Bling doesn't send Retry-After on this endpoint in practice — back off with a fixed ladder.
      await sleep(1000 * (attempt + 1));
    }
  }
}

// Confirmed by looking up the CNPJ that showed up in a real order's `intermediador` field.
// Add more roots here as new marketplaces show up (check the order's raw `intermediador.cnpj`).
const MARKETPLACE_CNPJ_ROOTS: Record<string, string> = {
  "27415911": "TikTok Shop", // Bytedance Brasil Tecnologia Ltda.
};

function originLabelFromIntermediador(intermediador: BlingOrderDetail["intermediador"]): string | null {
  const cnpjDigits = (intermediador?.cnpj || "").replace(/\D/g, "");
  const root = cnpjDigits.slice(0, 8);
  return MARKETPLACE_CNPJ_ROOTS[root] ?? null;
}

const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 50; // safety backstop — 5000 orders — not a real expected volume, just a runaway guard.

/** Lists sales order ids created in [sinceDate, today]. Paginates until a short page ends it. */
export async function fetchBlingOrderIds(sinceDate: string): Promise<string[]> {
  const ids: string[] = [];
  for (let pagina = 1; pagina <= LIST_MAX_PAGES; pagina++) {
    const data = await blingGet<{ data: Array<{ id: number }> }>("/pedidos/vendas", {
      pagina,
      limite: LIST_PAGE_SIZE,
      dataInicial: sinceDate,
    });
    const page = data.data ?? [];
    ids.push(...page.map((o) => String(o.id)));
    if (page.length < LIST_PAGE_SIZE) break;
  }
  return ids;
}

export async function fetchBlingOrderDetail(orderId: string): Promise<NormalizedBlingOrder> {
  const { data: order } = await blingGet<{ data: BlingOrderDetail }>(`/pedidos/vendas/${orderId}`);

  const items: BlingOrderItem[] = order.itens.map((item) => ({
    sku: item.codigo,
    nameSnapshot: item.descricao,
    priceSnapshot: item.valor,
    qty: item.quantidade,
  }));

  const etiqueta = order.transporte?.etiqueta;

  return {
    externalOrderId: String(order.id),
    originLabel: originLabelFromIntermediador(order.intermediador),
    customerName: order.contato?.nome || "Cliente Bling",
    customerPhone: null,
    shippingCep: (etiqueta?.cep || "").replace(/\D/g, ""),
    shippingState: etiqueta?.uf || "",
    shippingCity: etiqueta?.municipio || "",
    shippingNeighborhood: etiqueta?.bairro || "",
    shippingStreet: etiqueta?.endereco || "",
    shippingNumber: etiqueta?.numero || "S/N",
    shippingComplement: etiqueta?.complemento || null,
    shippingCost: order.transporte?.frete ?? 0,
    discount: order.desconto?.valor ?? 0,
    items,
  };
}
