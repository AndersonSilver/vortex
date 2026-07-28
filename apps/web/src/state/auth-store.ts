import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserDTO } from "@vortex/shared";

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: UserDTO, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserDTO) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: "vortex-auth" },
  ),
);

export function useIsAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === "admin");
}
