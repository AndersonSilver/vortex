import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AddressDTO, AddressInput } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useAuthStore } from "../state/auth-store";

const ADDRESSES_KEY = ["addresses"];

export function useAddresses() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ADDRESSES_KEY,
    queryFn: async () => {
      const { data } = await api.get<AddressDTO[]>("/addresses");
      return data;
    },
    enabled: !!accessToken,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddressInput) => {
      const { data } = await api.post<AddressDTO>("/addresses", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}
