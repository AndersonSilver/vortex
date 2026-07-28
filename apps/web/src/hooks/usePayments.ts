import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreatePaymentInput, PaymentResultDTO } from "@vortex/shared";
import { api } from "../lib/api-client";

export function useCreatePayment(orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePaymentInput) => {
      const { data } = await api.post<PaymentResultDTO>(`/payments/orders/${orderId}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}
