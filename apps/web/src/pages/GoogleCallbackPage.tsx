import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { UserDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useAuthStore } from "../state/auth-store";
import { useToast } from "../components/Toast";

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const { showToast } = useToast();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      showToast("Não foi possível entrar com o Google.", "error");
      navigate("/entrar", { replace: true });
      return;
    }

    setTokens(accessToken, refreshToken);
    api
      .get<UserDTO>("/auth/me", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ data }) => {
        setUser(data);
        navigate("/", { replace: true });
      })
      .catch(() => {
        showToast("Não foi possível concluir o login com Google.", "error");
        navigate("/entrar", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)" }}>Entrando com Google...</p>
      </div>
    </div>
  );
}
