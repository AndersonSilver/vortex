import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssetDTO, AssetInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const ASSETS_KEY = ["assets"];

export function useAssets(includeRetired = false) {
  return useQuery({
    queryKey: [...ASSETS_KEY, includeRetired],
    queryFn: async () => {
      const { data } = await api.get<AssetDTO[]>("/assets", {
        params: { includeRetired: includeRetired ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssetInput) => {
      const { data } = await api.post<AssetDTO>("/assets", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: AssetInput }) => {
      const { data } = await api.put<AssetDTO>(`/assets/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
  });
}

export function useRetireAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, disposedAt }: { id: string; disposedAt?: string }) => {
      const { data } = await api.post<AssetDTO>(`/assets/${id}/retire`, { disposedAt });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_KEY });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}
