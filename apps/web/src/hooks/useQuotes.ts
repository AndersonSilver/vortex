import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomQuoteDTO } from "@vortex/shared";
import { api } from "../lib/api-client";
import { useIsAdmin } from "../state/auth-store";

export interface CreateQuoteInput {
  file: File;
  material: string;
  color: string;
  qty: number;
  notes?: string;
  email: string;
}

export function useCreateQuote() {
  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const formData = new FormData();
      formData.append("file", input.file);
      formData.append("material", input.material);
      formData.append("color", input.color);
      formData.append("qty", String(input.qty));
      formData.append("email", input.email);
      if (input.notes) formData.append("notes", input.notes);
      const { data } = await api.post<CustomQuoteDTO>("/quotes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
  });
}

export function useAdminQuotes() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["admin", "quotes"],
    queryFn: async () => {
      const { data } = await api.get<CustomQuoteDTO[]>("/quotes");
      return data;
    },
    enabled: isAdmin,
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      quotedPrice,
    }: {
      id: string;
      status?: CustomQuoteDTO["status"];
      quotedPrice?: number;
    }) => {
      const { data } = await api.patch<CustomQuoteDTO>(`/quotes/${id}`, { status, quotedPrice });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "quotes"] }),
  });
}
