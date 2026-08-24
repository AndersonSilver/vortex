import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SupplyDTO,
  SupplyInput,
  SupplyMovementDTO,
  SupplyMovementInput,
  SupplyUpdateInput,
} from "@vortex/shared";
import { api } from "../lib/api-client";

const SUPPLIES_KEY = ["supplies"];

export function useSupplies(includeInactive = false) {
  return useQuery({
    queryKey: [...SUPPLIES_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<SupplyDTO[]>("/supplies", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useSupplyMovements(supplyId: string | null) {
  return useQuery({
    queryKey: [...SUPPLIES_KEY, supplyId, "movements"],
    queryFn: async () => {
      const { data } = await api.get<SupplyMovementDTO[]>(`/supplies/${supplyId}/movements`);
      return data;
    },
    enabled: !!supplyId,
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplyInput) => {
      const { data } = await api.post<SupplyDTO>("/supplies", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIES_KEY }),
  });
}

export function useUpdateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SupplyUpdateInput }) => {
      const { data } = await api.put<SupplyDTO>(`/supplies/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIES_KEY }),
  });
}

export function useDeleteSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/supplies/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIES_KEY }),
  });
}

export function useCreateSupplyMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SupplyMovementInput }) => {
      const { data } = await api.post<SupplyMovementDTO>(`/supplies/${id}/movements`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIES_KEY });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
