import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConsignmentAdjustmentInput,
  ConsignmentCatalogItemDTO,
  ConsignmentFinancialDTO,
  ConsignmentMovementDTO,
  ConsignmentMovementType,
  ConsignmentPaymentInput,
  ConsignmentRequestApproveInput,
  ConsignmentRequestDTO,
  ConsignmentRequestInput,
  ConsignmentRequestStatus,
  ConsignmentReturnInput,
  ConsignmentSaleInput,
  ConsignmentShipmentInput,
  ConsignmentStockDTO,
  ConsignmentStoreDTO,
  ConsignmentStoreInput,
  ConsignmentStoreSummaryDTO,
  ConsignmentSummaryDTO,
  ConsignmentUserDTO,
} from "@vortex/shared";
import { api } from "../lib/api-client";

export interface ConsignmentMovementFilters {
  type?: ConsignmentMovementType | "";
  productId?: string;
  from?: string;
  to?: string;
}

function cleanParams(filters: ConsignmentMovementFilters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
}

// --- Painel do consignado ------------------------------------------------------------

const ME = ["consignment", "me"] as const;

export function useMyConsignmentSummary() {
  return useQuery({
    queryKey: [...ME, "summary"],
    queryFn: async () => (await api.get<ConsignmentSummaryDTO>("/consignment/me/summary")).data,
  });
}

export function useMyConsignmentStock() {
  return useQuery({
    queryKey: [...ME, "stock"],
    queryFn: async () => (await api.get<ConsignmentStockDTO[]>("/consignment/me/stock")).data,
  });
}

export function useMyConsignmentMovements(filters: ConsignmentMovementFilters) {
  return useQuery({
    queryKey: [...ME, "movements", filters],
    queryFn: async () =>
      (await api.get<ConsignmentMovementDTO[]>("/consignment/me/movements", { params: cleanParams(filters) })).data,
  });
}

export function useMyConsignmentFinancial() {
  return useQuery({
    queryKey: [...ME, "financial"],
    queryFn: async () => (await api.get<ConsignmentFinancialDTO>("/consignment/me/financial")).data,
  });
}

export function useMyConsignmentCatalog() {
  return useQuery({
    queryKey: [...ME, "catalog"],
    queryFn: async () => (await api.get<ConsignmentCatalogItemDTO[]>("/consignment/me/catalog")).data,
  });
}

export function useMyConsignmentRequests() {
  return useQuery({
    queryKey: [...ME, "requests"],
    queryFn: async () => (await api.get<ConsignmentRequestDTO[]>("/consignment/me/requests")).data,
  });
}

/** Uma venda mexe em estoque, movimentos, financeiro e resumo: invalida tudo do painel. */
export function useRegisterConsignmentSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConsignmentSaleInput) =>
      (await api.post<ConsignmentSummaryDTO>("/consignment/me/sales", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME }),
  });
}

export function useCreateConsignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ConsignmentRequestInput) =>
      (await api.post<ConsignmentRequestDTO>("/consignment/me/requests", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME }),
  });
}

export function useCancelConsignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch<ConsignmentRequestDTO>(`/consignment/me/requests/${id}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME }),
  });
}

// --- Admin ---------------------------------------------------------------------------

const ADMIN = ["admin", "consignment"] as const;

export function useConsignmentStores() {
  return useQuery({
    queryKey: [...ADMIN, "stores"],
    queryFn: async () => (await api.get<ConsignmentStoreSummaryDTO[]>("/admin/consignment/stores")).data,
  });
}

export function useConsignmentStore(id: string) {
  return useQuery({
    queryKey: [...ADMIN, "store", id],
    queryFn: async () => (await api.get<ConsignmentStoreDTO>(`/admin/consignment/stores/${id}`)).data,
  });
}

export function useSaveConsignmentStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ConsignmentStoreInput }) =>
      id
        ? (await api.put<ConsignmentStoreDTO>(`/admin/consignment/stores/${id}`, input)).data
        : (await api.post<ConsignmentStoreDTO>("/admin/consignment/stores", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useConsignmentStoreUsers(storeId: string) {
  return useQuery({
    queryKey: [...ADMIN, "store", storeId, "users"],
    queryFn: async () => (await api.get<ConsignmentUserDTO[]>(`/admin/consignment/stores/${storeId}/users`)).data,
  });
}

export function useLinkConsignmentUser(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) =>
      (await api.post<ConsignmentUserDTO>(`/admin/consignment/stores/${storeId}/users`, { email })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useUnlinkConsignmentUser(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/consignment/stores/${storeId}/users/${userId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useConsignmentStoreStock(storeId: string) {
  return useQuery({
    queryKey: [...ADMIN, "store", storeId, "stock"],
    queryFn: async () => (await api.get<ConsignmentStockDTO[]>(`/admin/consignment/stores/${storeId}/stock`)).data,
  });
}

export function useConsignmentStoreMovements(storeId: string, filters: ConsignmentMovementFilters) {
  return useQuery({
    queryKey: [...ADMIN, "store", storeId, "movements", filters],
    queryFn: async () =>
      (
        await api.get<ConsignmentMovementDTO[]>(`/admin/consignment/stores/${storeId}/movements`, {
          params: cleanParams(filters),
        })
      ).data,
  });
}

export function useConsignmentStoreFinancial(storeId: string) {
  return useQuery({
    queryKey: [...ADMIN, "store", storeId, "financial"],
    queryFn: async () => (await api.get<ConsignmentFinancialDTO>(`/admin/consignment/stores/${storeId}/financial`)).data,
  });
}

/** Envio, devolução, ajuste e repasse mexem no mesmo conjunto de telas da loja. */
function useAdminMutation<TInput, TOutput>(fn: (input: TInput) => Promise<TOutput>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useShipToConsignmentStore(storeId: string) {
  return useAdminMutation(async (input: ConsignmentShipmentInput) =>
    (await api.post<ConsignmentStockDTO[]>(`/admin/consignment/stores/${storeId}/shipments`, input)).data,
  );
}

export function useReturnFromConsignmentStore(storeId: string) {
  return useAdminMutation(async (input: ConsignmentReturnInput) =>
    (await api.post<ConsignmentStockDTO[]>(`/admin/consignment/stores/${storeId}/returns`, input)).data,
  );
}

export function useAdjustConsignmentStock(storeId: string) {
  return useAdminMutation(async (input: ConsignmentAdjustmentInput) =>
    (await api.post<ConsignmentStockDTO[]>(`/admin/consignment/stores/${storeId}/adjustments`, input)).data,
  );
}

export function useSetConsignmentTransferPrice(storeId: string) {
  return useAdminMutation(async ({ productId, transferPrice }: { productId: string; transferPrice: number }) =>
    (await api.put<ConsignmentStockDTO>(`/admin/consignment/stores/${storeId}/stock/${productId}`, { transferPrice }))
      .data,
  );
}

export function useAddConsignmentPayment(storeId: string) {
  return useAdminMutation(async (input: ConsignmentPaymentInput) =>
    (await api.post<ConsignmentFinancialDTO>(`/admin/consignment/stores/${storeId}/payments`, input)).data,
  );
}

export function useDeleteConsignmentPayment(storeId: string) {
  return useAdminMutation(async (paymentId: string) =>
    (await api.delete<ConsignmentFinancialDTO>(`/admin/consignment/stores/${storeId}/payments/${paymentId}`)).data,
  );
}

export function useConsignmentRequests(filters: { status?: ConsignmentRequestStatus | ""; storeId?: string } = {}) {
  return useQuery({
    queryKey: [...ADMIN, "requests", filters],
    queryFn: async () =>
      (
        await api.get<ConsignmentRequestDTO[]>("/admin/consignment/requests", {
          params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
        })
      ).data,
  });
}

export function useApproveConsignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ConsignmentRequestApproveInput }) =>
      (await api.patch<ConsignmentRequestDTO>(`/admin/consignment/requests/${id}/approve`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useRejectConsignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adminNote }: { id: string; adminNote: string }) =>
      (await api.patch<ConsignmentRequestDTO>(`/admin/consignment/requests/${id}/reject`, { adminNote })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}

export function useShipConsignmentRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch<ConsignmentRequestDTO>(`/admin/consignment/requests/${id}/ship`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN }),
  });
}
