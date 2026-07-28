import { useQuery } from "@tanstack/react-query";
import type { DashboardStatsDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useIsAdmin } from "../state/auth-store";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
}

export function useDashboardStats() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardStatsDTO>("/admin/dashboard");
      return data;
    },
    enabled: isAdmin,
  });
}

export function useAdminCustomers() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data } = await api.get<CustomerRow[]>("/admin/customers");
      return data;
    },
    enabled: isAdmin,
  });
}
