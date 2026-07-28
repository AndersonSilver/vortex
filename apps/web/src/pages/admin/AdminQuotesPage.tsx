import { useAdminQuotes, useUpdateQuote } from "../../hooks/useQuotes";
import { useToast } from "../../components/Toast";

const STATUS_LABELS: Record<string, string> = { pending: "Aguardando", quoted: "Orçado", rejected: "Recusado" };

export function AdminQuotesPage() {
  const { data: quotes = [], isLoading } = useAdminQuotes();
  const updateQuote = useUpdateQuote();
  const { showToast } = useToast();

  function handlePriceQuote(id: string, currentPrice: number | null) {
    const value = window.prompt("Valor do orçamento (R$):", currentPrice ? String(currentPrice) : "");
    if (!value) return;
    const quotedPrice = parseFloat(value.replace(",", "."));
    if (Number.isNaN(quotedPrice)) return;
    updateQuote.mutate(
      { id, status: "quoted", quotedPrice },
      { onSuccess: () => showToast("Orçamento enviado.", "success") },
    );
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Orçamentos Personalizados</h1>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Material</th>
              <th>Cor</th>
              <th>Qtd</th>
              <th>E-mail</th>
              <th>Orçamento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                  Nenhuma solicitação de orçamento ainda.
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <a href={q.fileUrl} target="_blank" rel="noreferrer">
                      📁 Ver arquivo
                    </a>
                  </td>
                  <td>{q.material}</td>
                  <td>{q.color}</td>
                  <td>{q.qty}</td>
                  <td style={{ color: "var(--text-muted)" }}>{q.email}</td>
                  <td>{q.quotedPrice ? `R$ ${q.quotedPrice.toFixed(2)}` : "—"}</td>
                  <td>
                    <span className={`status-badge ${q.status === "quoted" ? "status-active" : q.status === "rejected" ? "status-cancelled" : "status-pending"}`}>
                      {STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => handlePriceQuote(q.id, q.quotedPrice)}>
                      💰 Orçar
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => updateQuote.mutate({ id: q.id, status: "rejected" })}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
