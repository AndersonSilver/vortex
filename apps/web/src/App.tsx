import { Outlet, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { PaymentPage } from "./pages/PaymentPage";
import { SuccessPage } from "./pages/SuccessPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { GoogleCallbackPage } from "./pages/GoogleCallbackPage";
import { AccountPage } from "./pages/AccountPage";
import { RequireAdmin, RequireAuth } from "./components/ProtectedRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "./pages/admin/AdminProductsPage";
import { AdminCouponsPage } from "./pages/admin/AdminCouponsPage";
import { AdminCustomersPage } from "./pages/admin/AdminCustomersPage";
import { AdminQuotesPage } from "./pages/admin/AdminQuotesPage";
import { AdminSettingsPage } from "./pages/admin/AdminSettingsPage";
import { AdminFilamentsPage } from "./pages/admin/AdminFilamentsPage";
import { AdminPricingCalculatorPage } from "./pages/admin/AdminPricingCalculatorPage";
import { AdminProductionPage } from "./pages/admin/AdminProductionPage";
import { AdminFinancialReportsPage } from "./pages/admin/AdminFinancialReportsPage";
import { AdminSuppliersPage } from "./pages/admin/AdminSuppliersPage";
import { AdminPurchaseOrdersPage } from "./pages/admin/AdminPurchaseOrdersPage";
import { AdminSuppliesPage } from "./pages/admin/AdminSuppliesPage";
import { AdminAssetsPage } from "./pages/admin/AdminAssetsPage";
import { AdminExpensesPage } from "./pages/admin/AdminExpensesPage";

function StorefrontLayout() {
  return (
    <div className="app-shell">
      <Outlet />
    </div>
  );
}

export function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/produtos/:slug" element={<ProductDetailPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pedido/:orderId/pagamento"
            element={
              <RequireAuth>
                <PaymentPage />
              </RequireAuth>
            }
          />
          <Route
            path="/pedido/:orderId/sucesso"
            element={
              <RequireAuth>
                <SuccessPage />
              </RequireAuth>
            }
          />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/cadastrar" element={<RegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route
            path="/conta"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="pedidos" element={<AdminOrdersPage />} />
          <Route path="produtos" element={<AdminProductsPage />} />
          <Route path="cupons" element={<AdminCouponsPage />} />
          <Route path="clientes" element={<AdminCustomersPage />} />
          <Route path="orcamentos" element={<AdminQuotesPage />} />
          <Route path="estoque" element={<AdminFilamentsPage />} />
          <Route path="fornecedores" element={<AdminSuppliersPage />} />
          <Route path="compras" element={<AdminPurchaseOrdersPage />} />
          <Route path="insumos" element={<AdminSuppliesPage />} />
          <Route path="ativos" element={<AdminAssetsPage />} />
          <Route path="despesas" element={<AdminExpensesPage />} />
          <Route path="producao" element={<AdminProductionPage />} />
          <Route path="precificacao" element={<AdminPricingCalculatorPage />} />
          <Route path="financeiro" element={<AdminFinancialReportsPage />} />
          <Route path="configuracoes" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </>
  );
}
