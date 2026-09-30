import type {
  ConsignmentCatalogItemDTO,
  ConsignmentFinancialDTO,
  ConsignmentMonthDTO,
  ConsignmentMovementDTO,
  ConsignmentMovementType,
  ConsignmentPaymentDTO,
  ConsignmentRequestApproveInput,
  ConsignmentRequestDTO,
  ConsignmentRequestInput,
  ConsignmentStockDTO,
  ConsignmentStoreDTO,
  ConsignmentStoreSummaryDTO,
  ConsignmentSummaryDTO,
} from "@vortex/shared";
import type { Request } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import {
  ConsignmentMovement,
  ConsignmentPayment,
  ConsignmentRequest,
  ConsignmentRequestItem,
  ConsignmentStock,
  ConsignmentStore,
  Product,
  User,
} from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { getSettingsEntity } from "../settings/settings.service";
import { applyConsignmentMovement, roundMoney } from "./consignment-stock.service";

const storeRepo = () => AppDataSource.getRepository(ConsignmentStore);
const stockRepo = () => AppDataSource.getRepository(ConsignmentStock);
const movementRepo = () => AppDataSource.getRepository(ConsignmentMovement);
const paymentRepo = () => AppDataSource.getRepository(ConsignmentPayment);
const requestRepo = () => AppDataSource.getRepository(ConsignmentRequest);

/**
 * created_at é timestamp sem fuso gravado em UTC. Datas, filtros e meses do painel seguem o
 * horário de Brasília, senão venda feita depois das 21h cai no dia (ou mês) seguinte.
 */
const LOCAL_CREATED_AT = "(m.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')";

// --- Mappers ----------------------------------------------------------------------

export function toStoreDTO(store: ConsignmentStore): ConsignmentStoreDTO {
  return {
    id: store.id,
    name: store.name,
    document: store.document ?? null,
    contactName: store.contactName ?? null,
    phone: store.phone ?? null,
    email: store.email ?? null,
    address: store.address ?? null,
    notes: store.notes ?? null,
    active: store.active,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

export function toStockDTO(stock: ConsignmentStock): ConsignmentStockDTO {
  const quantity = Number(stock.quantity);
  const transferPrice = Number(stock.transferPrice);
  return {
    id: stock.id,
    productId: stock.productId,
    productName: stock.product?.name ?? "",
    productSku: stock.product?.sku ?? null,
    productImageUrl: stock.product?.imageUrl ?? stock.product?.images?.[0] ?? null,
    productEmoji: stock.product?.emoji ?? "📦",
    productCategory: stock.product?.category ?? "",
    quantity,
    transferPrice,
    stockValue: roundMoney(quantity * transferPrice),
    updatedAt: stock.updatedAt.toISOString(),
  };
}

function toMovementDTO(movement: ConsignmentMovement): ConsignmentMovementDTO {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.product?.name ?? "",
    type: movement.type,
    changeQuantity: Number(movement.changeQuantity),
    transferPrice: Number(movement.transferPrice),
    amount: Number(movement.amount),
    note: movement.note ?? null,
    createdByName: movement.createdBy?.name ?? null,
    requestId: movement.requestId ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}

function toPaymentDTO(payment: ConsignmentPayment): ConsignmentPaymentDTO {
  return {
    id: payment.id,
    amount: Number(payment.amount),
    paidAt: payment.paidAt,
    method: payment.method,
    note: payment.note ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

function toRequestDTO(request: ConsignmentRequest, currentPrices: Map<string, number>): ConsignmentRequestDTO {
  return {
    id: request.id,
    storeId: request.storeId,
    storeName: request.store?.name ?? "",
    status: request.status,
    note: request.note ?? null,
    adminNote: request.adminNote ?? null,
    requestedByName: request.requestedBy?.name ?? null,
    items: [...(request.items ?? [])]
      .sort((a, b) => (a.product?.name ?? "").localeCompare(b.product?.name ?? ""))
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? "",
        productImageUrl: item.product?.imageUrl ?? item.product?.images?.[0] ?? null,
        productEmoji: item.product?.emoji ?? "📦",
        qtyRequested: item.qtyRequested,
        qtySent: item.qtySent ?? null,
        transferPrice: item.transferPrice !== null && item.transferPrice !== undefined ? Number(item.transferPrice) : null,
        currentTransferPrice: currentPrices.get(`${request.storeId}:${item.productId}`) ?? null,
      })),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    shippedAt: request.shippedAt ? request.shippedAt.toISOString() : null,
  };
}

async function currentPricesFor(requests: ConsignmentRequest[]): Promise<Map<string, number>> {
  const storeIds = [...new Set(requests.map((r) => r.storeId))];
  if (storeIds.length === 0) return new Map();
  const rows = await stockRepo().find({ where: { storeId: In(storeIds) }, select: ["storeId", "productId", "transferPrice"] });
  return new Map(rows.map((row) => [`${row.storeId}:${row.productId}`, Number(row.transferPrice)]));
}

// --- Loja do usuário logado ----------------------------------------------------

/**
 * Loja do consignado logado. Relê o usuário do banco em vez de confiar no token: um
 * usuário desligado da loja perde o acesso na hora, não só quando o access token vence.
 */
export async function resolveMyStore(req: Request): Promise<ConsignmentStore> {
  const user = await AppDataSource.getRepository(User).findOneBy({ id: req.auth!.userId });
  if (!user || user.role !== "consignado" || !user.consignmentStoreId) {
    throw new HttpError(403, "Seu usuário não está ligado a nenhuma loja consignada.");
  }
  const store = await storeRepo().findOneBy({ id: user.consignmentStoreId });
  if (!store || !store.active) {
    throw new HttpError(403, "A loja consignada está desativada. Fale com a Vortex.");
  }
  return store;
}

export async function getStoreOrFail(storeId: string): Promise<ConsignmentStore> {
  const store = await storeRepo().findOneBy({ id: storeId });
  if (!store) {
    throw new HttpError(404, "Loja consignada não encontrada.");
  }
  return store;
}

// --- Leituras --------------------------------------------------------------------

export async function listStock(storeId: string): Promise<ConsignmentStockDTO[]> {
  const rows = await stockRepo().find({ where: { storeId } });
  return rows.map(toStockDTO).sort((a, b) => a.productName.localeCompare(b.productName));
}

export interface MovementFilters {
  type?: ConsignmentMovementType;
  productId?: string;
  from?: string;
  to?: string;
}

export async function listMovements(storeId: string, filters: MovementFilters = {}): Promise<ConsignmentMovementDTO[]> {
  const qb = movementRepo()
    .createQueryBuilder("m")
    .leftJoinAndSelect("m.product", "product")
    .leftJoinAndSelect("m.createdBy", "createdBy")
    .where("m.store_id = :storeId", { storeId })
    // Com take + join o TypeORM exige o nome da propriedade no orderBy, não o da coluna.
    .orderBy("m.createdAt", "DESC")
    .take(500);
  if (filters.type) qb.andWhere("m.type = :type", { type: filters.type });
  if (filters.productId) qb.andWhere("m.product_id = :productId", { productId: filters.productId });
  if (filters.from) qb.andWhere(`${LOCAL_CREATED_AT} >= :from::date`, { from: filters.from });
  if (filters.to) qb.andWhere(`${LOCAL_CREATED_AT} < (:to::date + interval '1 day')`, { to: filters.to });
  const rows = await qb.getMany();
  return rows.map(toMovementDTO);
}

async function balanceTotals(storeIds: string[]): Promise<Map<string, { sales: number; paid: number }>> {
  const totals = new Map(storeIds.map((id) => [id, { sales: 0, paid: 0 }]));
  if (storeIds.length === 0) return totals;
  const sales: { storeId: string; total: string }[] = await movementRepo()
    .createQueryBuilder("m")
    .select("m.store_id", "storeId")
    .addSelect("COALESCE(SUM(m.amount), 0)", "total")
    .where("m.store_id IN (:...storeIds)", { storeIds })
    .groupBy("m.store_id")
    .getRawMany();
  const paid: { storeId: string; total: string }[] = await paymentRepo()
    .createQueryBuilder("p")
    .select("p.store_id", "storeId")
    .addSelect("COALESCE(SUM(p.amount), 0)", "total")
    .where("p.store_id IN (:...storeIds)", { storeIds })
    .groupBy("p.store_id")
    .getRawMany();
  for (const row of sales) totals.get(row.storeId)!.sales = Number(row.total);
  for (const row of paid) totals.get(row.storeId)!.paid = Number(row.total);
  return totals;
}

export async function getFinancial(storeId: string): Promise<ConsignmentFinancialDTO> {
  const totals = (await balanceTotals([storeId])).get(storeId)!;
  const salesByMonth: { month: string; pieces: string; total: string }[] = await movementRepo()
    .createQueryBuilder("m")
    .select(`to_char(${LOCAL_CREATED_AT}, 'YYYY-MM')`, "month")
    .addSelect("COALESCE(SUM(-m.change_quantity), 0)", "pieces")
    .addSelect("COALESCE(SUM(m.amount), 0)", "total")
    .where("m.store_id = :storeId AND m.type = 'sale'", { storeId })
    .groupBy("month")
    .getRawMany();
  const paidByMonth: { month: string; total: string }[] = await paymentRepo()
    .createQueryBuilder("p")
    .select("to_char(p.paid_at, 'YYYY-MM')", "month")
    .addSelect("COALESCE(SUM(p.amount), 0)", "total")
    .where("p.store_id = :storeId", { storeId })
    .groupBy("month")
    .getRawMany();

  const months = new Map<string, ConsignmentMonthDTO>();
  const monthRow = (month: string) => {
    if (!months.has(month)) months.set(month, { month, piecesSold: 0, salesAmount: 0, paidAmount: 0 });
    return months.get(month)!;
  };
  for (const row of salesByMonth) {
    const m = monthRow(row.month);
    m.piecesSold = Number(row.pieces);
    m.salesAmount = Number(row.total);
  }
  for (const row of paidByMonth) monthRow(row.month).paidAmount = Number(row.total);

  const payments = await paymentRepo().find({ where: { storeId }, order: { paidAt: "DESC", createdAt: "DESC" } });
  const settings = await getSettingsEntity();

  return {
    totalSales: roundMoney(totals.sales),
    totalPaid: roundMoney(totals.paid),
    balanceDue: roundMoney(totals.sales - totals.paid),
    months: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
    payments: payments.map(toPaymentDTO),
    pixKey: settings.pixKey || null,
  };
}

export async function getSummary(store: ConsignmentStore): Promise<ConsignmentSummaryDTO> {
  const stock = await listStock(store.id);
  const totals = (await balanceTotals([store.id])).get(store.id)!;
  const month: { pieces: string; total: string } | undefined = await movementRepo()
    .createQueryBuilder("m")
    .select("COALESCE(SUM(-m.change_quantity), 0)", "pieces")
    .addSelect("COALESCE(SUM(m.amount), 0)", "total")
    .where("m.store_id = :storeId AND m.type = 'sale'", { storeId: store.id })
    .andWhere(`${LOCAL_CREATED_AT} >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')`)
    .getRawOne();
  const openRequests = await requestRepo().count({ where: { storeId: store.id, status: In(["pending", "approved"]) } });

  return {
    store: toStoreDTO(store),
    piecesOnHand: stock.reduce((sum, row) => sum + row.quantity, 0),
    productsCount: stock.filter((row) => row.quantity > 0).length,
    stockValue: roundMoney(stock.reduce((sum, row) => sum + row.stockValue, 0)),
    monthPiecesSold: Number(month?.pieces ?? 0),
    monthSalesAmount: roundMoney(Number(month?.total ?? 0)),
    balanceDue: roundMoney(totals.sales - totals.paid),
    openRequests,
  };
}

export async function listStoreSummaries(): Promise<ConsignmentStoreSummaryDTO[]> {
  const stores = await storeRepo().find({ order: { name: "ASC" } });
  const ids = stores.map((s) => s.id);
  const totals = await balanceTotals(ids);
  const stockRows: { storeId: string; pieces: string; value: string }[] = ids.length
    ? await stockRepo()
        .createQueryBuilder("s")
        .select("s.store_id", "storeId")
        .addSelect("COALESCE(SUM(s.quantity), 0)", "pieces")
        .addSelect("COALESCE(SUM(s.quantity * s.transfer_price), 0)", "value")
        .where("s.store_id IN (:...ids)", { ids })
        .groupBy("s.store_id")
        .getRawMany()
    : [];
  const pendingRows: { storeId: string; count: string }[] = ids.length
    ? await requestRepo()
        .createQueryBuilder("r")
        .select("r.store_id", "storeId")
        .addSelect("COUNT(*)", "count")
        .where("r.store_id IN (:...ids) AND r.status IN ('pending', 'approved')", { ids })
        .groupBy("r.store_id")
        .getRawMany()
    : [];
  const userRows: { storeId: string; count: string }[] = ids.length
    ? await AppDataSource.getRepository(User)
        .createQueryBuilder("u")
        .select("u.consignment_store_id", "storeId")
        .addSelect("COUNT(*)", "count")
        .where("u.consignment_store_id IN (:...ids)", { ids })
        .groupBy("u.consignment_store_id")
        .getRawMany()
    : [];
  const byStore = <T extends { storeId: string }>(rows: T[]) => new Map(rows.map((r) => [r.storeId, r]));
  const stockMap = byStore(stockRows);
  const pendingMap = byStore(pendingRows);
  const userMap = byStore(userRows);

  return stores.map((store) => {
    const t = totals.get(store.id)!;
    return {
      ...toStoreDTO(store),
      piecesOnHand: Number(stockMap.get(store.id)?.pieces ?? 0),
      stockValue: roundMoney(Number(stockMap.get(store.id)?.value ?? 0)),
      balanceDue: roundMoney(t.sales - t.paid),
      pendingRequests: Number(pendingMap.get(store.id)?.count ?? 0),
      usersCount: Number(userMap.get(store.id)?.count ?? 0),
    };
  });
}

export async function listCatalog(storeId: string): Promise<ConsignmentCatalogItemDTO[]> {
  const products = await AppDataSource.getRepository(Product).find({ where: { active: true }, order: { name: "ASC" } });
  const stock = new Map((await stockRepo().find({ where: { storeId } })).map((row) => [row.productId, row]));
  return products.map((product) => {
    const row = stock.get(product.id);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku ?? null,
      category: product.category,
      imageUrl: product.imageUrl ?? product.images?.[0] ?? null,
      emoji: product.emoji,
      transferPrice: row ? Number(row.transferPrice) : null,
      quantityOnHand: row ? Number(row.quantity) : 0,
    };
  });
}

export async function listRequests(where: { storeId?: string; status?: string } = {}): Promise<ConsignmentRequestDTO[]> {
  const requests = await requestRepo().find({
    where: {
      ...(where.storeId ? { storeId: where.storeId } : {}),
      ...(where.status ? { status: where.status as ConsignmentRequest["status"] } : {}),
    },
    order: { createdAt: "DESC" },
    take: 200,
  });
  const prices = await currentPricesFor(requests);
  return requests.map((request) => toRequestDTO(request, prices));
}

async function getRequestOrFail(id: string, storeId?: string): Promise<ConsignmentRequest> {
  const request = await requestRepo().findOneBy({ id, ...(storeId ? { storeId } : {}) });
  if (!request) {
    throw new HttpError(404, "Pedido de reposição não encontrado.");
  }
  return request;
}

async function requestDTO(id: string): Promise<ConsignmentRequestDTO> {
  const request = await getRequestOrFail(id);
  return toRequestDTO(request, await currentPricesFor([request]));
}

// --- Escritas --------------------------------------------------------------------

async function assertActiveProducts(productIds: string[]): Promise<void> {
  const found = await AppDataSource.getRepository(Product).count({ where: { id: In(productIds), active: true } });
  if (found !== productIds.length) {
    throw new HttpError(400, "Algum produto do pedido não existe ou está inativo no site.");
  }
}

export async function createRequest(storeId: string, userId: string, input: ConsignmentRequestInput) {
  await assertActiveProducts(input.items.map((item) => item.productId));
  const request = await requestRepo().save(
    requestRepo().create({
      storeId,
      requestedByUserId: userId,
      status: "pending",
      note: input.note ?? null,
      items: input.items.map((item) =>
        AppDataSource.getRepository(ConsignmentRequestItem).create({
          productId: item.productId,
          qtyRequested: item.qty,
        }),
      ),
    }),
  );
  return requestDTO(request.id);
}

export async function cancelRequest(storeId: string, requestId: string) {
  const request = await getRequestOrFail(requestId, storeId);
  if (request.status !== "pending") {
    throw new HttpError(400, "Só dá para cancelar pedido que ainda está aguardando aprovação.");
  }
  await requestRepo().update({ id: request.id }, { status: "cancelled" });
  return requestDTO(request.id);
}

export async function approveRequest(requestId: string, input: ConsignmentRequestApproveInput) {
  const request = await getRequestOrFail(requestId);
  if (request.status !== "pending") {
    throw new HttpError(400, "Só dá para aprovar pedido que está aguardando aprovação.");
  }
  const byId = new Map(input.items.map((item) => [item.itemId, item]));
  if (request.items.some((item) => !byId.has(item.id)) || byId.size !== request.items.length) {
    throw new HttpError(400, "Informe a quantidade de todos os itens do pedido.");
  }
  if (input.items.every((item) => item.qtySent === 0)) {
    throw new HttpError(400, "Nenhum item vai ser enviado. Recuse o pedido em vez de aprovar.");
  }

  const prices = await currentPricesFor([request]);
  await AppDataSource.transaction(async (manager) => {
    for (const item of request.items) {
      const decision = byId.get(item.id)!;
      const current = prices.get(`${request.storeId}:${item.productId}`) ?? null;
      const transferPrice = decision.transferPrice ?? current;
      if (decision.qtySent > 0 && !transferPrice) {
        throw new HttpError(400, `Informe o repasse de "${item.product?.name}": a loja ainda não trabalha com ele.`);
      }
      await manager.getRepository(ConsignmentRequestItem).update(
        { id: item.id },
        { qtySent: decision.qtySent, transferPrice: decision.qtySent > 0 ? transferPrice : null },
      );
    }
    await manager
      .getRepository(ConsignmentRequest)
      .update({ id: request.id }, { status: "approved", adminNote: input.adminNote ?? null });
  });
  return requestDTO(request.id);
}

export async function rejectRequest(requestId: string, adminNote: string) {
  const request = await getRequestOrFail(requestId);
  if (request.status !== "pending" && request.status !== "approved") {
    throw new HttpError(400, "Esse pedido já foi finalizado.");
  }
  await requestRepo().update({ id: request.id }, { status: "rejected", adminNote });
  return requestDTO(request.id);
}

/** Marca o pedido como enviado e dá entrada das peças no estoque da loja, tudo ou nada. */
export async function shipRequest(requestId: string, userId: string) {
  const request = await getRequestOrFail(requestId);
  if (request.status !== "approved") {
    throw new HttpError(400, "Só dá para enviar pedido aprovado.");
  }
  await AppDataSource.transaction(async (manager) => {
    for (const item of request.items) {
      if (!item.qtySent) continue;
      await applyConsignmentMovement(manager, request.storeId, item.productId, "shipment", item.qtySent, {
        transferPrice: item.transferPrice !== null && item.transferPrice !== undefined ? Number(item.transferPrice) : null,
        note: "Reposição solicitada pela loja",
        userId,
        requestId: request.id,
      });
    }
    await manager.getRepository(ConsignmentRequest).update({ id: request.id }, { status: "shipped", shippedAt: new Date() });
  });
  return requestDTO(request.id);
}
