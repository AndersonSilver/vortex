import axios from "axios";
import { useAuthStore } from "../state/auth-store";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(error: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}
