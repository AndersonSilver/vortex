import { useAdminCustomers } from "../../hooks/useAdmin";

export function AdminCustomersPage() {
  const { data: customers = [], isLoading } = useAdminCustomers();

  return (
    <div>
      <div className="admin-header">
        <h1>Clientes</h1>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Pedidos</th>
              <th>Total Gasto</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                  Carregando...
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{c.email}</td>
                  <td>
                    <span style={{ fontFamily: "Orbitron, monospace", color: "var(--purple)" }}>{c.ordersCount}</span>
                  </td>
                  <td>
                    <strong>R$ {c.totalSpent.toFixed(2)}</strong>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
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
