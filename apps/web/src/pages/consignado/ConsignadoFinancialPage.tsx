import { FinancialView } from "../../components/consignment-views";
import { useMyConsignmentFinancial } from "../../hooks/useConsignment";

export function ConsignadoFinancialPage() {
  const { data: financial, isLoading } = useMyConsignmentFinancial();

  return (
    <div>
      <div className="admin-header">
        <h1>Financeiro</h1>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", maxWidth: 720 }}>
        Cada venda registrada soma o repasse da peça ao saldo. Os pagamentos que a Vortex recebe de você abatem o saldo.
      </p>
      {isLoading || !financial ? (
        <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
      ) : (
        <FinancialView financial={financial} showPixKey />
      )}
    </div>
  );
}
