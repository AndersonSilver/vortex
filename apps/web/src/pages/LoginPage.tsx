import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLogin } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { API_URL, extractErrorMessage } from "../lib/api-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (searchParams.get("googleError")) {
      showToast("Não foi possível entrar com o Google. Tente novamente.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate("/"),
        onError: (error) => showToast(extractErrorMessage(error, "E-mail ou senha inválidos."), "error"),
      },
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Entrar</h1>
        <p className="auth-sub">Acesse sua conta Vórtex 3D.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" style={{ width: "100%" }} type="submit" disabled={login.isPending}>
            Entrar
          </button>
        </form>
        <div className="section-divider" />
        <button className="btn-outline" style={{ width: "100%" }} onClick={handleGoogleLogin}>
          Entrar com Google
        </button>
        <div className="auth-switch">
          Não tem conta? <button onClick={() => navigate("/cadastrar")}>Criar conta</button>
        </div>
      </div>
    </div>
  );
}
