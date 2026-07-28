import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StoreSettingsDTO, StoreSettingsInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const SETTINGS_KEY = ["settings"];

export function useStoreSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const { data } = await api.get<StoreSettingsDTO>("/settings");
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StoreSettingsInput) => {
      const { data } = await api.put<StoreSettingsDTO>("/settings", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
