import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginInput, RegisterInput, UserDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useAuthStore } from "../state/auth-store";

interface AuthResponse {
  user: UserDTO;
  accessToken: string;
  refreshToken: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<AuthResponse>("/auth/login", input);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries();
    },
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>("/auth/register", input);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.accessToken, data.refreshToken);
      queryClient.invalidateQueries();
    },
  });
}

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<UserDTO>("/auth/me");
      setUser(data);
      return data;
    },
    enabled: !!accessToken,
    retry: false,
  });
}
