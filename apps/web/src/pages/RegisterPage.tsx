import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRegister } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { API_URL, extractErrorMessage } from "../lib/api-client";

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      showToast("A senha deve ter pelo menos 8 caracteres.", "error");
      return;
    }
    register.mutate(
      { name, email, password },
      {
        onSuccess: () => navigate("/"),
        onError: (error) => showToast(extractErrorMessage(error, "Não foi possível criar sua conta."), "error"),
      },
    );
  }

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Criar conta</h1>
        <p className="auth-sub">Cadastre-se para acompanhar seus pedidos.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" style={{ width: "100%" }} type="submit" disabled={register.isPending}>
            Criar conta
          </button>
        </form>
        <div className="section-divider" />
        <button className="btn-outline" style={{ width: "100%" }} onClick={handleGoogleLogin}>
          Continuar com Google
        </button>
        <div className="auth-switch">
          Já tem conta? <button onClick={() => navigate("/entrar")}>Entrar</button>
        </div>
      </div>
    </div>
  );
}
