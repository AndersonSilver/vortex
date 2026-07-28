import { Router } from "express";
import {
  purchaseOrderSchema,
  purchaseOrderStatusSchema,
  type PurchaseOrderDTO,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { PurchaseOrder, Supplier } from "../../entities";
import { applyFilamentMovement } from "../filaments/filament-stock.service";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const purchaseOrdersRouter = Router();

const purchaseOrderRepo = () => AppDataSource.getRepository(PurchaseOrder);
const supplierRepo = () => AppDataSource.getRepository(Supplier);

function toPurchaseOrderDTO(po: PurchaseOrder): PurchaseOrderDTO {
  const items = po.items.map((item) => ({
    id: item.id,
    filamentId: item.filamentId,
    filamentLabel: `${item.filament.brand} · ${item.filament.color}`,
    quantityGrams: item.quantityGrams,
    totalCost: Number(item.totalCost),
  }));
  return {
    id: po.id,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    status: po.status,
    notes: po.notes ?? null,
    receivedAt: po.receivedAt ? po.receivedAt.toISOString() : null,
    items,
    totalCost: items.reduce((sum, i) => sum + i.totalCost, 0),
    createdAt: po.createdAt.toISOString(),
  };
}

purchaseOrdersRouter.use(requireAuth, requireRole("admin"));

purchaseOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: PurchaseOrderStatus };
    const where = status ? { status } : {};
    const orders = await purchaseOrderRepo().find({
      where,
      relations: { supplier: true },
      order: { createdAt: "DESC" },
    });
    res.json(orders.map(toPurchaseOrderDTO));
  }),
);

purchaseOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await purchaseOrderRepo().findOne({ where: { id: req.params.id }, relations: { supplier: true } });
    if (!po) {
      throw new HttpError(404, "Compra não encontrada.");
    }
    res.json(toPurchaseOrderDTO(po));
  }),
);

purchaseOrdersRouter.post(
  "/",
  validateBody(purchaseOrderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PurchaseOrderInput;
    const supplier = await supplierRepo().findOneBy({ id: body.supplierId });
    if (!supplier) {
      throw new HttpError(404, "Fornecedor não encontrado.");
    }
    const po = purchaseOrderRepo().create({
      supplierId: body.supplierId,
      notes: body.notes ?? null,
      items: body.items.map((item) => ({
        filamentId: item.filamentId,
        quantityGrams: item.quantityGrams,
        totalCost: item.totalCost,
      })),
    });
    const saved = await purchaseOrderRepo().save(po);
    const withRelations = await purchaseOrderRepo().findOneOrFail({
      where: { id: saved.id },
      relations: { supplier: true },
    });
    res.status(201).json(toPurchaseOrderDTO(withRelations));
  }),
);

purchaseOrdersRouter.patch(
  "/:id/status",
  validateBody(purchaseOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const po = await purchaseOrderRepo().findOne({ where: { id: req.params.id }, relations: { supplier: true } });
    if (!po) {
      throw new HttpError(404, "Compra não encontrada.");
    }
    if (po.status !== "pending") {
      throw new HttpError(400, "Só é possível receber ou cancelar compras pendentes.");
    }
    const { status } = req.body as { status: "received" | "cancelled" };
    if (status === "received") {
      for (const item of po.items) {
        await applyFilamentMovement(item.filamentId, item.quantityGrams, "purchase", `Compra ${po.id.slice(0, 8)}`);
      }
      po.receivedAt = new Date();
    }
    po.status = status;
    await purchaseOrderRepo().save(po);
    res.json(toPurchaseOrderDTO(po));
  }),
);

purchaseOrdersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await purchaseOrderRepo().findOneBy({ id: req.params.id });
    if (!po) {
      throw new HttpError(404, "Compra não encontrada.");
    }
    if (po.status !== "pending") {
      throw new HttpError(400, "Só é possível excluir compras pendentes.");
    }
    await purchaseOrderRepo().remove(po);
    res.status(204).send();
  }),
);
