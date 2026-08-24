import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CostRatesDTO,
  ExpenseEntryDTO,
  ExpenseEntryInput,
  ExpenseSource,
  ExpenseSummaryDTO,
} from "@vortex/shared";
import { api } from "../lib/api-client";

const EXPENSES_KEY = ["expenses"];

interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  source?: ExpenseSource;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, filters],
    queryFn: async () => {
      const { data } = await api.get<ExpenseEntryDTO[]>("/expenses", { params: filters });
      return data;
    },
  });
}

export function useExpenseSummary(from: string, to: string) {
  return useQuery({
    queryKey: [...EXPENSES_KEY, "summary", from, to],
    queryFn: async () => {
      const { data } = await api.get<ExpenseSummaryDTO>("/expenses/summary", { params: { from, to } });
      return data;
    },
  });
}

export function useCostRates() {
  return useQuery({
    queryKey: [...EXPENSES_KEY, "cost-rates"],
    queryFn: async () => {
      const { data } = await api.get<CostRatesDTO>("/expenses/cost-rates");
      return data;
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseEntryInput) => {
      const { data } = await api.post<ExpenseEntryDTO>("/expenses", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXPENSES_KEY }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EXPENSES_KEY }),
  });
}

/** Gera as despesas fixas e a depreciação de um mês (AAAA-MM). */
export function usePostMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => {
      const { data } = await api.post<{ recurring: number; depreciation: number }>("/expenses/post-month", { month });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
  });
}

export function useApplyCostRates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<CostRatesDTO>("/expenses/cost-rates/apply");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_KEY });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
