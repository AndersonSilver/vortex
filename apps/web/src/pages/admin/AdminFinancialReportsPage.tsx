import { useState } from "react";
import { useProductProfitReport, useSalesReport } from "../../hooks/useReports";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toISODate(d);
}

const PRESETS = [
  { label: "7 dias", days: 6 },
  { label: "30 dias", days: 29 },
  { label: "90 dias", days: 89 },
];

export function AdminFinancialReportsPage() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(toISODate(new Date()));

  const { data: sales, isLoading: loadingSales } = useSalesReport(from, to);
  const { data: products = [], isLoading: loadingProducts } = useProductProfitReport(from, to);

  const maxProfit = Math.max(...(sales?.byDay.map((d) => Math.abs(d.profit)) ?? [1]), 1);

  function applyPreset(days: number) {
    setFrom(daysAgo(days));
    setTo(toISODate(new Date()));
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Financeiro</h1>
      </div>

      <div className="tabs">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`tab-btn${from === daysAgo(p.days) && to === toISODate(new Date()) ? " active" : ""}`}
            onClick={() => applyPreset(p.days)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="admin-form" style={{ display: "flex", gap: "1rem", alignItems: "flex-end", marginBottom: "1.5rem" }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>De</label>
          <input className="admin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Até</label>
          <input className="admin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {loadingSales || !sales ? (
        <p style={{ color: "var(--text-muted)" }}>Carregando relatório...</p>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Receita</div>
              <div className="kpi-value">R$ {sales.revenue.toFixed(2)}</div>
              <div className="kpi-icon">💰</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Custo</div>
              <div className="kpi-value">R$ {sales.cost.toFixed(2)}</div>
              <div className="kpi-icon">🧾</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Lucro</div>
              <div className="kpi-value">R$ {sales.profit.toFixed(2)}</div>
              <div className="kpi-icon">💹</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Margem</div>
              <div className="kpi-value">{sales.marginPercent.toFixed(1)}%</div>
              <div className="kpi-icon">📊</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pedidos</div>
              <div className="kpi-value">{sales.ordersCount}</div>
              <div className="kpi-icon">📦</div>
            </div>
          </div>

          <div className="chart-wrap" style={{ marginBottom: "1.5rem" }}>
            <div className="chart-title">Lucro por dia</div>
            <div className="chart-bars">
              {sales.byDay.map((day, i) => (
                <div className="chart-bar-wrap" key={i}>
                  <div
                    className="chart-bar"
                    style={{
                      height: `${Math.max((Math.abs(day.profit) / maxProfit) * 100, 2)}px`,
                      background: day.profit < 0 ? "var(--danger)" : undefined,
                    }}
                    title={`R$ ${day.profit.toFixed(2)}`}
                  />
                  <div className="chart-bar-label">{day.label}</div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span style={{ color: "var(--purple)" }}>■</span> Lucro · <span style={{ color: "var(--danger)" }}>■</span> Prejuízo
            </div>
          </div>
        </>
      )}

      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h3>Lucro por Produto</h3>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Unidades</th>
              <th>Receita</th>
              <th>Custo</th>
              <th>Lucro</th>
              <th>Margem</th>
            </tr>
          </thead>
          <tbody>
            {loadingProducts ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                  Nenhuma venda no período.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td style={{ color: "var(--text-muted)" }}>{p.unitsSold}</td>
                  <td>R$ {p.revenue.toFixed(2)}</td>
                  <td style={{ color: "var(--text-muted)" }}>R$ {p.cost.toFixed(2)}</td>
                  <td style={{ color: p.profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                    R$ {p.profit.toFixed(2)}
                  </td>
                  <td>{p.marginPercent.toFixed(0)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: ".78rem", marginTop: ".8rem" }}>
        Margem estimada com base no custo registrado no momento da venda; para pedidos sem esse registro, usa o custo
        atual cadastrado do produto.
      </p>
    </div>
  );
}
