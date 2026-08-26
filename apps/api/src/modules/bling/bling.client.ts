import axios from "axios";
import { env } from "../../config/env";
import { ensureFreshBlingAccessToken } from "./bling-oauth.service";
import type { BlingOrderItem, NormalizedBlingOrder } from "./bling-order.types";

// Bling API v3 "Pedido de venda" response shape (subset used here). Field names per the general
// v3 schema — re-check against a live response (GET /pedidos/vendas/{id} once OAuth is connected)
// before relying on this in production, Bling's docs site doesn't expose a static schema to diff against.
interface BlingOrderDetail {
  id: number;
  situacao?: { id: number; valor?: number };
  loja?: { id: number };
  contato?: { nome?: string; telefone?: string; celular?: string };
  itens: Array<{ codigo: string; descricao: string; quantidade: number; valor: number }>;
  transporte?: {
    frete?: number;
    etiqueta?: {
      nome?: string;
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

async function blingGet<T>(path: string): Promise<T> {
  const accessToken = await ensureFreshBlingAccessToken();
  const { data } = await axios.get<T>(`${env.bling.baseUrl}${path}`, {
    timeout: 8000,
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  return data;
}

// Store names rarely change mid-session; a tiny in-memory cache avoids one extra Bling call per order.
const storeNameCache = new Map<number, string>();

async function fetchStoreName(lojaId: number): Promise<string | null> {
  const cached = storeNameCache.get(lojaId);
  if (cached) return cached;
  try {
    const { data } = await blingGet<{ data: { descricao?: string; nome?: string } }>(`/lojas/${lojaId}`);
    const name = data.descricao || data.nome || null;
    if (name) storeNameCache.set(lojaId, name);
    return name;
  } catch (err) {
    console.warn(`Não foi possível obter o nome da loja Bling ${lojaId}:`, err);
    return null;
  }
}

const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 50; // safety backstop — 5000 orders — not a real expected volume, just a runaway guard.

/**
 * Lists sales order ids created in [sinceDate, today]. Paginates until a short page ends it.
 * Query param names/pagination shape per the general v3 "list" convention (`pagina`/`limite`) —
 * re-check against a live response once OAuth is connected.
 */
export async function fetchBlingOrderIds(sinceDate: string): Promise<string[]> {
  const ids: string[] = [];
  for (let pagina = 1; pagina <= LIST_MAX_PAGES; pagina++) {
    const accessToken = await ensureFreshBlingAccessToken();
    const { data } = await axios.get<{ data: Array<{ id: number }> }>(`${env.bling.baseUrl}/pedidos/vendas`, {
      timeout: 8000,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      params: { pagina, limite: LIST_PAGE_SIZE, dataInicial: sinceDate },
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
  const originLabel = order.loja ? await fetchStoreName(order.loja.id) : null;

  return {
    externalOrderId: String(order.id),
    originLabel,
    customerName: etiqueta?.nome || order.contato?.nome || "Cliente Bling",
    customerPhone: order.contato?.celular || order.contato?.telefone || null,
    shippingCep: (etiqueta?.cep || "").replace(/\D/g, ""),
    shippingState: etiqueta?.uf || "",
    shippingCity: etiqueta?.municipio || "",
    shippingNeighborhood: etiqueta?.bairro || "",
    shippingStreet: etiqueta?.endereco || "",
    shippingNumber: etiqueta?.numero || "S/N",
    shippingComplement: etiqueta?.complemento || null,
    shippingCost: order.transporte?.frete ?? 0,
    items,
  };
}
