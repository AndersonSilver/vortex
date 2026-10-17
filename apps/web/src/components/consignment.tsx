import type { ReactNode } from "react";
import {
  CONSIGNMENT_MOVEMENT_TYPE_LABELS,
  CONSIGNMENT_REQUEST_STATUS_LABELS,
  type ConsignmentMovementType,
  type ConsignmentRequestStatus,
} from "@vortex/shared";

export { brl } from "../lib/format";

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** "2026-09" → "set/2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

/** Estoque igual ou abaixo disso conta como "acabando" e entra nas sugestões de reposição. */
export const LOW_STOCK = 1;

/** "hoje", "ontem" ou "há N dias", contando dias de calendário. */
export function relativeDay(date: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(date)) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const REQUEST_STATUS_CLASS: Record<ConsignmentRequestStatus, string> = {
  pending: "status-pending",
  approved: "status-printing",
  shipped: "status-shipped",
  rejected: "status-cancelled",
  cancelled: "status-inactive",
};

export function RequestStatusBadge({ status }: { status: ConsignmentRequestStatus }) {
  return <span className={`status-badge ${REQUEST_STATUS_CLASS[status]}`}>{CONSIGNMENT_REQUEST_STATUS_LABELS[status]}</span>;
}

const MOVEMENT_CLASS: Record<ConsignmentMovementType, string> = {
  shipment: "status-shipped",
  sale: "status-delivered",
  return: "status-pending",
  adjustment: "status-inactive",
};

export function MovementTypeBadge({ type }: { type: ConsignmentMovementType }) {
  return <span className={`status-badge ${MOVEMENT_CLASS[type]}`}>{CONSIGNMENT_MOVEMENT_TYPE_LABELS[type]}</span>;
}

export function ProductThumb({
  imageUrl,
  emoji,
  name,
  subtitle,
}: {
  imageUrl: string | null;
  emoji: string;
  name: string;
  subtitle?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
        />
      ) : (
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "var(--bg3)",
            display: "grid",
            placeItems: "center",
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          {emoji}
        </span>
      )}
      <span>
        {name}
        {subtitle && <span style={{ display: "block", fontSize: ".78rem", color: "var(--text-muted)" }}>{subtitle}</span>}
      </span>
    </div>
  );
}

export interface PickerOption {
  productId: string;
  name: string;
  /** Texto curto ao lado do nome no select, ex.: "3 em loja". */
  hint?: string;
  /** Limite de quantidade (estoque em loja), quando existe. */
  max?: number;
}

export interface PickerRow {
  productId: string;
  qty: string;
  transferPrice: string;
}

export function emptyPickerRow(): PickerRow {
  return { productId: "", qty: "1", transferPrice: "" };
}

/**
 * Lista de "produto + quantidade" usada em venda, envio, devolução e pedido de reposição.
 * Com showTransferPrice, cada linha ganha o campo de repasse (envio do admin).
 */
export function ProductQtyPicker({
  rows,
  onChange,
  options,
  showTransferPrice = false,
  transferPriceHint,
}: {
  rows: PickerRow[];
  onChange: (rows: PickerRow[]) => void;
  options: PickerOption[];
  showTransferPrice?: boolean;
  transferPriceHint?: (productId: string) => number | null;
}) {
  const update = (index: number, patch: Partial<PickerRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const chosen = new Set(rows.map((row) => row.productId));

  return (
    <div>
      {rows.map((row, index) => {
        const option = options.find((o) => o.productId === row.productId);
        const currentPrice = row.productId && transferPriceHint ? transferPriceHint(row.productId) : null;
        return (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: showTransferPrice ? "1fr 90px 120px auto" : "1fr 90px auto",
              gap: ".5rem",
              alignItems: "end",
              marginBottom: ".6rem",
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              {index === 0 && <label>Produto</label>}
              <select
                className="admin-select"
                value={row.productId}
                onChange={(e) => update(index, { productId: e.target.value, transferPrice: "" })}
              >
                <option value="">Escolha…</option>
                {options.map((o) => (
                  <option key={o.productId} value={o.productId} disabled={o.productId !== row.productId && chosen.has(o.productId)}>
                    {o.name}
                    {o.hint ? ` · ${o.hint}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              {index === 0 && <label>Qtd</label>}
              <input
                className="admin-input"
                type="number"
                min={1}
                max={option?.max}
                value={row.qty}
                onChange={(e) => update(index, { qty: e.target.value })}
              />
            </div>
            {showTransferPrice && (
              <div className="form-group" style={{ margin: 0 }}>
                {index === 0 && <label>Repasse (R$)</label>}
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.transferPrice}
                  placeholder={currentPrice !== null ? currentPrice.toFixed(2) : "obrigatório"}
                  onChange={(e) => update(index, { transferPrice: e.target.value })}
                />
              </div>
            )}
            <button
              className="action-btn danger"
              style={{ marginBottom: 2 }}
              disabled={rows.length === 1}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              title="Remover linha"
            >
              ✕
            </button>
          </div>
        );
      })}
      <button className="action-btn" onClick={() => onChange([...rows, emptyPickerRow()])}>
        + Adicionar produto
      </button>
    </div>
  );
}

/** Converte as linhas do picker em itens válidos, ou devolve a mensagem de erro para o toast. */
export function pickerToItems(
  rows: PickerRow[],
  options: PickerOption[],
): { items: { productId: string; qty: number; transferPrice: number | null }[] } | { error: string } {
  const filled = rows.filter((row) => row.productId);
  if (filled.length === 0) return { error: "Escolha ao menos um produto." };
  const items = [];
  for (const row of filled) {
    const qty = parseInt(row.qty, 10);
    const option = options.find((o) => o.productId === row.productId);
    if (!Number.isInteger(qty) || qty <= 0) return { error: `Quantidade inválida em "${option?.name ?? "produto"}".` };
    if (option?.max !== undefined && qty > option.max) {
      return { error: `"${option.name}" tem só ${option.max} em loja.` };
    }
    const price = row.transferPrice ? parseFloat(row.transferPrice.replace(",", ".")) : null;
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      return { error: `Repasse inválido em "${option?.name ?? "produto"}".` };
    }
    items.push({ productId: row.productId, qty, transferPrice: price });
  }
  return { items };
}
