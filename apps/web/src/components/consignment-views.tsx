import { useState, type ReactNode } from "react";
import {
  CONSIGNMENT_MOVEMENT_TYPE_LABELS,
  CONSIGNMENT_MOVEMENT_TYPES,
  CONSIGNMENT_PAYMENT_METHOD_LABELS,
  type ConsignmentFinancialDTO,
  type ConsignmentMonthDTO,
  type ConsignmentMovementDTO,
  type ConsignmentMovementType,
  type ConsignmentPaymentDTO,
} from "@vortex/shared";
import type { ConsignmentMovementFilters } from "../hooks/useConsignment";
import { brl, formatDateTime, formatMonth, MovementTypeBadge } from "./consignment";

/** Histórico de movimentos da loja, com filtros. Usado no painel do consignado e no admin. */
export function MovementsView({
  movements,
  isLoading,
  filters,
  onFiltersChange,
  productOptions,
}: {
  movements: ConsignmentMovementDTO[];
  isLoading: boolean;
  filters: ConsignmentMovementFilters;
  onFiltersChange: (filters: ConsignmentMovementFilters) => void;
  productOptions: { productId: string; name: string }[];
}) {
  const totals = movements.reduce(
    (acc, m) => (m.type === "sale" ? { pieces: acc.pieces - m.changeQuantity, amount: acc.amount + m.amount } : acc),
    { pieces: 0, amount: 0 },
  );

  return (
    <div>
      <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: "1rem" }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Tipo</label>
          <select
            className="admin-select"
            value={filters.type ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as ConsignmentMovementType | "" })}
          >
            <option value="">Todos</option>
            {CONSIGNMENT_MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSIGNMENT_MOVEMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Produto</label>
          <select
            className="admin-select"
            value={filters.productId ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, productId: e.target.value })}
          >
            <option value="">Todos</option>
            {productOptions.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>De</label>
          <input
            className="admin-input"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Até</label>
          <input
            className="admin-input"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
          />
        </div>
      </div>

      {totals.pieces > 0 && (
        <p style={{ color: "var(--text-muted)", marginBottom: ".8rem", fontSize: ".9rem" }}>
          Vendas no filtro: <strong>{totals.pieces} peças</strong> · <strong>{brl(totals.amount)}</strong> a repassar
        </p>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Qtd</th>
              <th>Repasse</th>
              <th>Valor</th>
              <th>Por</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Nenhum movimento.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontSize: ".82rem" }}>{formatDateTime(m.createdAt)}</td>
                  <td>
                    <MovementTypeBadge type={m.type} />
                  </td>
                  <td>{m.productName}</td>
                  <td style={{ color: m.changeQuantity > 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                    {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}
                  </td>
                  <td>{brl(m.transferPrice)}</td>
                  <td>{m.amount > 0 ? brl(m.amount) : "—"}</td>
                  <td style={{ fontSize: ".82rem" }}>{m.createdByName ?? "—"}</td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{m.note ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Cards de saldo da loja. `children` entra como cards extras no fim da grade. */
export function FinancialKpis({ financial, children }: { financial: ConsignmentFinancialDTO; children?: ReactNode }) {
  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <div className="kpi-label">Saldo a repassar</div>
        <div className="kpi-value" style={{ color: financial.balanceDue > 0 ? "var(--warning)" : "var(--success)" }}>
          {brl(financial.balanceDue)}
        </div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Total vendido (repasse)</div>
        <div className="kpi-value">{brl(financial.totalSales)}</div>
      </div>
      <div className="kpi-card">
        <div className="kpi-label">Total já pago</div>
        <div className="kpi-value">{brl(financial.totalPaid)}</div>
      </div>
      {children}
    </div>
  );
}

export function PixKeyCard({ pixKey, amount }: { pixKey: string; amount: number }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="kpi-card">
      <div className="kpi-label">Pague o repasse por Pix</div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <code style={{ fontSize: "1.05rem", color: "var(--cyan)" }}>{pixKey}</code>
        <button className="action-btn" onClick={copy}>
          {copied ? "✅ Copiado" : "📋 Copiar"}
        </button>
      </div>
      <div style={{ marginTop: ".9rem", fontSize: ".9rem" }}>
        Valor em aberto: <strong>{brl(amount)}</strong>
      </div>
      <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
        Depois de pagar, avise a Vortex. O pagamento aparece aqui quando for lançado.
      </div>
    </div>
  );
}

export function MonthsTable({ months }: { months: ConsignmentMonthDTO[] }) {
  return (
    <div className="admin-table-wrap">
      <div className="admin-table-header">
        <h3>Mês a mês</h3>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Mês</th>
            <th>Peças vendidas</th>
            <th>Vendido (repasse)</th>
            <th>Pago</th>
          </tr>
        </thead>
        <tbody>
          {months.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                Nenhuma venda nem pagamento ainda.
              </td>
            </tr>
          ) : (
            months.map((m) => (
              <tr key={m.month}>
                <td>{formatMonth(m.month)}</td>
                <td>{m.piecesSold}</td>
                <td>{brl(m.salesAmount)}</td>
                <td>{brl(m.paidAmount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PaymentsTable({
  payments,
  onDeletePayment,
}: {
  payments: ConsignmentPaymentDTO[];
  onDeletePayment?: (paymentId: string) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <div className="admin-table-header">
        <h3>Pagamentos recebidos pela Vortex</h3>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Valor</th>
            <th>Forma</th>
            <th>Obs.</th>
            {onDeletePayment && <th></th>}
          </tr>
        </thead>
        <tbody>
          {payments.length === 0 ? (
            <tr>
              <td colSpan={onDeletePayment ? 5 : 4} style={{ color: "var(--text-muted)" }}>
                Nenhum pagamento lançado.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p.id}>
                <td>{new Date(`${p.paidAt}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>
                  <strong>{brl(p.amount)}</strong>
                </td>
                <td>{CONSIGNMENT_PAYMENT_METHOD_LABELS[p.method]}</td>
                <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{p.note ?? ""}</td>
                {onDeletePayment && (
                  <td>
                    <button className="action-btn danger" onClick={() => onDeletePayment(p.id)} title="Excluir">
                      🗑
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Saldo corrido da loja: vendas menos pagamentos, mês a mês. Visão do admin. */
export function FinancialView({
  financial,
  onDeletePayment,
}: {
  financial: ConsignmentFinancialDTO;
  onDeletePayment?: (paymentId: string) => void;
}) {
  return (
    <div>
      <FinancialKpis financial={financial} />
      <div style={{ marginBottom: "1.5rem" }}>
        <MonthsTable months={financial.months} />
      </div>
      <PaymentsTable payments={financial.payments} onDeletePayment={onDeletePayment} />
    </div>
  );
}
