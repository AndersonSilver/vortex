import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PrintJobDTO, PrintJobInput, PrintJobStatus, PrintJobStatusUpdateInput } from "@vortex/shared";
import { api } from "../lib/api-client";

const PRINT_JOBS_KEY = ["print-jobs"];

export function usePrintJobs(status?: PrintJobStatus) {
  return useQuery({
    queryKey: [...PRINT_JOBS_KEY, status],
    queryFn: async () => {
      const { data } = await api.get<PrintJobDTO[]>("/print-jobs", { params: { status } });
      return data;
    },
  });
}

export function useCreatePrintJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PrintJobInput) => {
      const { data } = await api.post<PrintJobDTO>("/print-jobs", input);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINT_JOBS_KEY }),
  });
}

export function useUpdatePrintJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: PrintJobStatusUpdateInput }) => {
      const { data } = await api.patch<PrintJobDTO>(`/print-jobs/${id}/status`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRINT_JOBS_KEY });
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
    },
  });
}

export function useDeletePrintJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/print-jobs/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRINT_JOBS_KEY }),
  });
}
