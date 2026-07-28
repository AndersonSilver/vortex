import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  FilamentDTO,
  FilamentInput,
  FilamentMovementDTO,
  FilamentMovementInput,
  FilamentUpdateInput,
} from "@vortex/shared";
import { api } from "../lib/api-client";

const FILAMENTS_KEY = ["filaments"];

export function useFilaments(includeInactive = false) {
  return useQuery({
    queryKey: [...FILAMENTS_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<FilamentDTO[]>("/filaments", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreateFilament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FilamentInput) => {
      const { data } = await api.post<FilamentDTO>("/filaments", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILAMENTS_KEY }),
  });
}

export function useUpdateFilament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: FilamentUpdateInput }) => {
      const { data } = await api.put<FilamentDTO>(`/filaments/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILAMENTS_KEY }),
  });
}

export function useDeactivateFilament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/filaments/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FILAMENTS_KEY }),
  });
}

export function useFilamentMovements(filamentId: string | undefined) {
  return useQuery({
    queryKey: ["filament-movements", filamentId],
    queryFn: async () => {
      const { data } = await api.get<FilamentMovementDTO[]>(`/filaments/${filamentId}/movements`);
      return data;
    },
    enabled: !!filamentId,
  });
}

export function useCreateFilamentMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ filamentId, input }: { filamentId: string; input: FilamentMovementInput }) => {
      const { data } = await api.post<FilamentMovementDTO>(`/filaments/${filamentId}/movements`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: FILAMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["filament-movements", variables.filamentId] });
    },
  });
}
