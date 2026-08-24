import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RecurringExpenseDTO, RecurringExpenseInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const RECURRING_KEY = ["recurring-expenses"];

export function useRecurringExpenses(includeInactive = false) {
  return useQuery({
    queryKey: [...RECURRING_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<RecurringExpenseDTO[]>("/recurring-expenses", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecurringExpenseInput) => {
      const { data } = await api.post<RecurringExpenseDTO>("/recurring-expenses", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useUpdateRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: RecurringExpenseInput }) => {
      const { data } = await api.put<RecurringExpenseDTO>(`/recurring-expenses/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recurring-expenses/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
  });
}
