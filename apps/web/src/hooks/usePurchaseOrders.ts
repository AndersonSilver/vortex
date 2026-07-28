import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PurchaseOrderDTO,
  PurchaseOrderInput,
  PurchaseOrderStatus,
  PurchaseOrderStatusInput,
} from "@vortex/shared";
import { api } from "../lib/api-client";

const PURCHASE_ORDERS_KEY = ["purchase-orders"];

export function usePurchaseOrders(status?: PurchaseOrderStatus) {
  return useQuery({
    queryKey: [...PURCHASE_ORDERS_KEY, status],
    queryFn: async () => {
      const { data } = await api.get<PurchaseOrderDTO[]>("/purchase-orders", { params: { status } });
      return data;
    },
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PurchaseOrderInput) => {
      const { data } = await api.post<PurchaseOrderDTO>("/purchase-orders", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY }),
  });
}

export function useUpdatePurchaseOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PurchaseOrderStatusInput }) => {
      const { data } = await api.patch<PurchaseOrderDTO>(`/purchase-orders/${id}/status`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/purchase-orders/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY }),
  });
}
