import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupplierDTO, SupplierInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const SUPPLIERS_KEY = ["suppliers"];

export function useSuppliers(includeInactive = false) {
  return useQuery({
    queryKey: [...SUPPLIERS_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<SupplierDTO[]>("/suppliers", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierInput) => {
      const { data } = await api.post<SupplierDTO>("/suppliers", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SupplierInput }) => {
      const { data } = await api.put<SupplierDTO>(`/suppliers/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}

export function useDeactivateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY }),
  });
}
