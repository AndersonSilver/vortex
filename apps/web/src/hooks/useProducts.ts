import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductDTO, ProductInput } from "@vortex/shared";
import { api } from "../lib/api-client";

export function useProducts(category?: string, includeInactive = false) {
  return useQuery({
    queryKey: ["products", category, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<ProductDTO[]>("/products", {
        params: {
          category: category && category !== "all" ? category : undefined,
          includeInactive: includeInactive ? "true" : undefined,
        },
      });
      return data;
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await api.get<ProductDTO>(`/products/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      const { data } = await api.post<ProductDTO>("/products", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProductInput }) => {
      const { data } = await api.put<ProductDTO>(`/products/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ProductDTO>(`/products/${id}/toggle`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });
}
