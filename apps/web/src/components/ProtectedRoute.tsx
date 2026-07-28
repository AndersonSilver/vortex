import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore, useIsAdmin } from "../state/auth-store";

export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/entrar" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAdmin = useIsAdmin();
  if (!accessToken) return <Navigate to="/entrar" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
