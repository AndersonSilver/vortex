import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PrinterDTO,
  PrinterInput,
  PrinterMaintenanceLogDTO,
  PrinterMaintenanceLogInput,
  PrinterStatusInput,
} from "@vortex/shared";
import { api } from "../lib/api-client";

const PRINTERS_KEY = ["printers"];

export function usePrinters(includeInactive = false) {
  return useQuery({
    queryKey: [...PRINTERS_KEY, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<PrinterDTO[]>("/printers", {
        params: { includeInactive: includeInactive ? "true" : undefined },
      });
      return data;
    },
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PrinterInput) => {
      const { data } = await api.post<PrinterDTO>("/printers", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINTERS_KEY }),
  });
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PrinterInput }) => {
      const { data } = await api.put<PrinterDTO>(`/printers/${id}`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINTERS_KEY }),
  });
}

export function useUpdatePrinterStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PrinterStatusInput }) => {
      const { data } = await api.patch<PrinterDTO>(`/printers/${id}/status`, input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINTERS_KEY }),
  });
}

export function useDeactivatePrinter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/printers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINTERS_KEY }),
  });
}

export function usePrinterMaintenance(printerId: string | undefined) {
  return useQuery({
    queryKey: ["printer-maintenance", printerId],
    queryFn: async () => {
      const { data } = await api.get<PrinterMaintenanceLogDTO[]>(`/printers/${printerId}/maintenance`);
      return data;
    },
    enabled: !!printerId,
  });
}

export function useCreatePrinterMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ printerId, input }: { printerId: string; input: PrinterMaintenanceLogInput }) => {
      const { data } = await api.post<PrinterMaintenanceLogDTO>(`/printers/${printerId}/maintenance`, input);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PRINTERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["printer-maintenance", variables.printerId] });
    },
  });
}
