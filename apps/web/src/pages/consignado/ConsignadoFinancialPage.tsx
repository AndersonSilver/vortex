import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CONSIGNMENT_PAYMENT_METHOD_LABELS, type ConsignmentFinancialDTO, type ConsignmentMovementDTO } from "@vortex/shared";
import { brl, formatDateTime, relativeDay } from "../../components/consignment";
import { FinancialKpis, MonthsTable, PaymentsTable, PixKeyCard } from "../../components/consignment-views";
import {
  useMyConsignmentFinancial,
  useMyConsignmentMovements,
  type ConsignmentMovementFilters,
} from "../../hooks/useConsignment";

const SALES: ConsignmentMovementFilters = { type: "sale" };
const STATEMENT_SIZE = 15;

const STEPS = [
  { icon: "🧾", title: "Registre cada venda", text: "Em Produtos e vendas, clique em Vendi. O estoque baixa na hora." },
  { icon: "➕", title: "O repasse entra no saldo", text: "Cada peça vendida soma o valor de repasse ao saldo a repassar." },
  { icon: "💸", title: "Pague por Pix", text: "Pague quando quiser e avise a Vortex. Quando ela lançar, o saldo abate." },
];

interface StatementEntry {
  key: string;
  /** Momento usado na ordem do extrato. */
  at: string;
  /** Dia pago, só em pagamentos. */
  paidAt?: string;
  kind: "sale" | "payment";
  title: string;
  detail: string;
  /** Texto completo para o tooltip quando o detail foi encurtado. */
  fullDetail: string;
  /** Quanto o lançamento mexe no saldo: venda soma, pagamento abate. */
  amount: number;
  balanceAfter: number;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Junta vendas e pagamentos numa lista só, do mais novo pro mais antigo, com o saldo depois de cada um. */
function buildStatement(sales: ConsignmentMovementDTO[], financial: ConsignmentFinancialDTO): StatementEntry[] {
  // Uma venda registrada com vários produtos vira um movimento por produto, todos com o mesmo createdAt.
  const salesByRegister = new Map<string, ConsignmentMovementDTO[]>();
  for (const m of sales) salesByRegister.set(m.createdAt, [...(salesByRegister.get(m.createdAt) ?? []), m]);

  const entries: Omit<StatementEntry, "balanceAfter">[] = [
    ...[...salesByRegister.entries()].map(([at, items]) => {
      const pieces = items.reduce((sum, i) => sum - i.changeQuantity, 0);
      const products = items.map((i) => `${-i.changeQuantity}× ${i.productName}`);
      const note = items[0].note ? ` — “${items[0].note}”` : "";
      const shown = products.slice(0, 3).join(", ") + (products.length > 3 ? ` e mais ${products.length - 3}` : "");
      return {
        key: `sale-${at}`,
        at,
        kind: "sale" as const,
        title: `Venda · ${plural(pieces, "peça", "peças")}`,
        detail: shown + note,
        fullDetail: products.join(", ") + note,
        amount: items.reduce((sum, i) => sum + i.amount, 0),
      };
    }),
    ...financial.payments.map((p) => {
      // paidAt é só a data, sem hora. A ordem segue o lançamento (createdAt, mesmo relógio das vendas),
      // que é quando o saldo de fato abate; a coluna Data mostra o dia pago.
      const detail = p.note ?? "Recebido pela Vortex";
      return {
        key: `payment-${p.id}`,
        at: p.createdAt,
        paidAt: p.paidAt,
        kind: "payment" as const,
        title: `Pagamento · ${CONSIGNMENT_PAYMENT_METHOD_LABELS[p.method]}`,
        detail,
        fullDetail: detail,
        amount: -p.amount,
      };
    }),
  ];

  let balance = financial.balanceDue;
  return entries
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, STATEMENT_SIZE)
    .map((entry) => {
      const row = { ...entry, balanceAfter: balance };
      balance -= entry.amount;
      return row;
    });
}

export function ConsignadoFinancialPage() {
  const navigate = useNavigate();
  const { data: financial, isLoading } = useMyConsignmentFinancial();
  const { data: sales = [] } = useMyConsignmentMovements(SALES);

  const topProducts = useMemo(() => {
    const byProduct = new Map<string, { name: string; pieces: number; amount: number }>();
    for (const m of sales) {
      const row = byProduct.get(m.productId) ?? { name: m.productName, pieces: 0, amount: 0 };
      row.pieces -= m.changeQuantity;
      row.amount += m.amount;
      byProduct.set(m.productId, row);
    }
    return [...byProduct.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [sales]);

  const statement = useMemo(() => (financial ? buildStatement(sales, financial) : []), [sales, financial]);

  if (isLoading || !financial) {
    return (
      <div>
        <div className="admin-header">
          <h1>Financeiro</h1>
        </div>
        <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  const lastPayment = financial.payments[0];
  const topMax = topProducts[0]?.amount ?? 0;

  return (
    <div>
      <div className="admin-header">
        <h1>Financeiro</h1>
      </div>

      <FinancialKpis financial={financial}>
        <div className="kpi-card">
          <div className="kpi-label">Último pagamento</div>
          {lastPayment ? (
            <>
              <div className="kpi-value">{brl(lastPayment.amount)}</div>
              <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
                {new Date(`${lastPayment.paidAt}T00:00:00`).toLocaleDateString("pt-BR")} · {relativeDay(new Date(`${lastPayment.paidAt}T00:00:00`))}
              </div>
            </>
          ) : (
            <>
              <div className="kpi-value" style={{ color: "var(--text-muted)" }}>
                —
              </div>
              <div className="kpi-change" style={{ color: "var(--text-muted)" }}>
                Nenhum pagamento lançado ainda
              </div>
            </>
          )}
        </div>
      </FinancialKpis>

      <div className="panel-grid">
        {financial.balanceDue > 0 && financial.pixKey ? (
          <PixKeyCard pixKey={financial.pixKey} amount={financial.balanceDue} />
        ) : (
          <div className="kpi-card">
            <div className="kpi-label">Repasse</div>
            {financial.balanceDue > 0 ? (
              <p style={{ fontSize: ".95rem" }}>
                Você tem <strong>{brl(financial.balanceDue)}</strong> a repassar. Fale com a Vortex para combinar o
                pagamento.
              </p>
            ) : (
              <p style={{ fontSize: ".95rem" }}>✅ Tudo em dia. Nenhum repasse pendente.</p>
            )}
          </div>
        )}

        <div className="kpi-card">
          <div className="kpi-label">Como funciona o repasse</div>
          <ol className="how-steps">
            {STEPS.map((step) => (
              <li key={step.title}>
                <span className="how-step-icon">{step.icon}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="panel-grid">
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h3>Mais vendidos</h3>
            <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>por valor de repasse</span>
          </div>
          {topProducts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1.2rem 1.5rem" }}>Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="top-products">
              {topProducts.map((p) => (
                <li key={p.name} title={`${p.name}: ${Math.round((p.amount / financial.totalSales) * 100)}% do vendido`}>
                  <div className="top-products-row">
                    <span>{p.name}</span>
                    <span>
                      <span style={{ color: "var(--text-muted)" }}>{plural(p.pieces, "peça", "peças")} · </span>
                      <strong>{brl(p.amount)}</strong>
                    </span>
                  </div>
                  <div className="top-products-track">
                    <div className="top-products-bar" style={{ width: `${(p.amount / topMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <MonthsTable months={financial.months} />
      </div>

      <div className="admin-table-wrap" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-table-header">
          <h3>Extrato</h3>
          <button className="action-btn" onClick={() => navigate("/consignado/historico")}>
            Ver histórico completo →
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Lançamento</th>
              <th>Valor</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {statement.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-muted)" }}>
                  Nenhuma venda nem pagamento ainda.
                </td>
              </tr>
            ) : (
              statement.map((e) => (
                <tr key={e.key}>
                  <td style={{ fontSize: ".82rem", whiteSpace: "nowrap" }}>
                    {e.paidAt ? new Date(`${e.paidAt}T00:00:00`).toLocaleDateString("pt-BR") : formatDateTime(e.at)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: ".7rem", alignItems: "flex-start" }}>
                      <span>{e.kind === "sale" ? "🧾" : "💸"}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{e.title}</div>
                        <div style={{ fontSize: ".8rem", color: "var(--text-muted)" }} title={e.fullDetail}>
                          {e.detail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{ whiteSpace: "nowrap", fontWeight: 600, color: e.amount < 0 ? "var(--success)" : undefined }}
                  >
                    {e.amount < 0 ? `− ${brl(-e.amount)}` : `+ ${brl(e.amount)}`}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{brl(e.balanceAfter)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaymentsTable payments={financial.payments} />
    </div>
  );
}
