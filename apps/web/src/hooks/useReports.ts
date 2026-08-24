import { useQuery } from "@tanstack/react-query";
import type { ProductProfitDTO, ProfitLossReportDTO, SalesReportDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useIsAdmin } from "../state/auth-store";

export function useProductProfitReport(from: string, to: string) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "reports", "products", from, to],
    queryFn: async () => {
      const { data } = await api.get<ProductProfitDTO[]>("/admin/reports/products", { params: { from, to } });
      return data;
    },
    enabled: isAdmin,
  });
}

export function useSalesReport(from: string, to: string) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "reports", "sales", from, to],
    queryFn: async () => {
      const { data } = await api.get<SalesReportDTO>("/admin/reports/sales", { params: { from, to } });
      return data;
    },
    enabled: isAdmin,
  });
}

export function useProfitLossReport(from: string, to: string) {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "reports", "profit-loss", from, to],
    queryFn: async () => {
      const { data } = await api.get<ProfitLossReportDTO>("/admin/reports/profit-loss", { params: { from, to } });
      return data;
    },
    enabled: isAdmin,
  });
}
