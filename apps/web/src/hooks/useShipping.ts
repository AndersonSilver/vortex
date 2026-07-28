import { useMutation } from "@tanstack/react-query";
import type { ShippingQuoteOption } from "@vortex/shared";
import { api } from "../lib/api-client";

export function useShippingQuote() {
  return useMutation({
    mutationFn: async (cepDestino: string) => {
      const { data } = await api.post<ShippingQuoteOption[]>("/shipping/quote", { cepDestino });
      return data;
    },
  });
}
