import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductCategoryDTO, ProductCategoryInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const CATEGORIES_KEY = ["product-categories"];

export function useProductCategories(includeInactive = false) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<ProductCategoryDTO[]>("/product-categories", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Traduz o slug gravado no produto para o nome da categoria. Produto de categoria já
 * excluída cai no próprio slug, que ainda diz mais do que um espaço em branco.
 */
export function useCategoryLabel(): (slug: string) => string {
  const { data: categories = [] } = useProductCategories(true);
  return useMemo(() => {
    const labels = new Map(categories.map((category) => [category.slug, category.name]));
    return (slug: string) => labels.get(slug) ?? slug;
  }, [categories]);
}

export function useCreateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductCategoryInput) => {
      const { data } = await api.post<ProductCategoryDTO>("/product-categories", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ProductCategoryInput }) => {
      const { data } = await api.put<ProductCategoryDTO>(`/product-categories/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/product-categories/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
