import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { UserRole } from "@vortex/shared";
import { useAuthStore } from "../state/auth-store";

export function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/entrar" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.user?.role);
  if (!accessToken) return <Navigate to="/entrar" replace />;
  if (!role || !roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <RequireRole roles={["admin"]}>{children}</RequireRole>;
}
