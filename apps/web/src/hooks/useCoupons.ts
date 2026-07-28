import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CouponDTO, CouponInput } from "@vortex/shared";
import { api } from "../lib/api-client";

export interface ApplyCouponResult {
  coupon: CouponDTO;
  subtotal: number;
  discount: number;
}

export function useApplyCoupon() {
  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<ApplyCouponResult>("/coupons/apply", { code });
      return data;
    },
  });
}

export function useAdminCoupons() {
  return useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data } = await api.get<CouponDTO[]>("/coupons");
      return data;
    },
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CouponInput) => {
      const { data } = await api.post<CouponDTO>("/coupons", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useToggleCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<CouponDTO>(`/coupons/${id}/toggle`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/coupons/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}
