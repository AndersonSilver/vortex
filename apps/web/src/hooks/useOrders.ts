import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateManualOrderInput,
  CreateOrderInput,
  OrderDTO,
  OrderStatus,
  UpdateManualOrderDiscountInput,
} from "@vortex/shared";
import { api } from "../lib/api-client";
import { useAuthStore } from "../state/auth-store";

export function useMyOrders() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["orders", "mine"],
    queryFn: async () => {
      const { data } = await api.get<OrderDTO[]>("/orders");
      return data;
    },
    enabled: !!accessToken,
  });
}

export function useAdminOrders(status?: OrderStatus | "all") {
  return useQuery({
    queryKey: ["admin", "orders", status],
    queryFn: async () => {
      const { data } = await api.get<OrderDTO[]>("/orders", {
        params: { status: status && status !== "all" ? status : undefined },
      });
      return data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data } = await api.get<OrderDTO>(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const { data } = await api.post<OrderDTO>("/orders", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCreateManualOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateManualOrderInput) => {
      const { data } = await api.post<OrderDTO>("/orders/manual", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { data } = await api.patch<OrderDTO>(`/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateOrderTracking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trackingCode }: { id: string; trackingCode: string }) => {
      const { data } = await api.patch<OrderDTO>(`/orders/${id}/tracking`, { trackingCode });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

export function useUpdateManualOrderDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateManualOrderDiscountInput) => {
      const { data } = await api.patch<OrderDTO>(`/orders/${id}/manual-discount`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
