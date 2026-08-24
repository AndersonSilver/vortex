import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExpenseCategoryDTO, ExpenseCategoryInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const CATEGORIES_KEY = ["expense-categories"];

export function useExpenseCategories(includeInactive = false) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<ExpenseCategoryDTO[]>("/expense-categories", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseCategoryInput) => {
      const { data } = await api.post<ExpenseCategoryDTO>("/expense-categories", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ExpenseCategoryInput }) => {
      const { data } = await api.put<ExpenseCategoryDTO>(`/expense-categories/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expense-categories/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}
