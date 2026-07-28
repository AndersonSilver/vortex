import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartAddItemInput, CartItemDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useAuthStore } from "../state/auth-store";

const CART_KEY = ["cart"];

export function useCart() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: CART_KEY,
    queryFn: async () => {
      const { data } = await api.get<CartItemDTO[]>("/cart");
      return data;
    },
    enabled: !!accessToken,
  });
}

export function useCartCount(): number {
  const { data } = useCart();
  return data?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CartAddItemInput) => {
      const { data } = await api.post<CartItemDTO>("/cart/items", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, qty }: { id: string; qty: number }) => {
      const { data } = await api.put<CartItemDTO>(`/cart/items/${id}`, { qty });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/cart/items/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/cart");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CART_KEY }),
  });
}
