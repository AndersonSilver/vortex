import { Link, useNavigate } from "react-router-dom";
import { useAuthStore, useIsAdmin } from "../state/auth-store";
import { useCartCount } from "../hooks/useCart";

export function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const cartCount = useCartCount();

  return (
    <nav className="app-nav">
      <Link to="/" className="nav-logo">
        VÓRTEX 3D
      </Link>
      <div className="nav-links">
        <Link to="/">Início</Link>
        <a href="/#catalog">Catálogo</a>
        <a href="/#custom">Personalizado</a>
        <a href="/#how">Como funciona</a>
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/conta" className="btn-ghost nav-greeting">
              <span className="nav-greeting-icon" aria-hidden="true">
                👤
              </span>
              <span className="nav-text">Olá, {user.name.split(" ")[0]}</span>
            </Link>
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Sair
            </button>
          </>
        ) : (
          <Link to="/entrar" className="btn-ghost">
            Entrar
          </Link>
        )}
        <button className="cart-btn" onClick={() => navigate("/carrinho")}>
          🛒 <span className="nav-text">Carrinho</span>{" "}
          <span className="cart-badge">{cartCount}</span>
        </button>
        {isAdmin && (
          <button className="btn-admin" onClick={() => navigate("/admin")}>
            ⚡ <span className="nav-text">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
}
