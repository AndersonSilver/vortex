import { Router } from "express";
import {
  purchaseOrderSchema,
  purchaseOrderStatusSchema,
  type PurchaseOrderInput,
  type PurchaseOrderStatus,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { PurchaseOrder, Supplier } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import {
  createPurchaseOrder,
  findPurchaseOrder,
  receivePurchaseOrder,
  toPurchaseOrderDTO,
} from "./purchase-orders.service";

export const purchaseOrdersRouter = Router();

const purchaseOrderRepo = () => AppDataSource.getRepository(PurchaseOrder);
const supplierRepo = () => AppDataSource.getRepository(Supplier);

purchaseOrdersRouter.use(requireAuth, requireRole("admin"));

purchaseOrdersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: PurchaseOrderStatus };
    const where = status ? { status } : {};
    const orders = await purchaseOrderRepo().find({
      where,
      relations: { supplier: true },
      order: { purchasedAt: "DESC", createdAt: "DESC" },
    });
    res.json(orders.map(toPurchaseOrderDTO));
  }),
);

purchaseOrdersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json(toPurchaseOrderDTO(await findPurchaseOrder(req.params.id)));
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
    const po = await createPurchaseOrder(body);
    res.status(201).json(toPurchaseOrderDTO(po));
  }),
);

purchaseOrdersRouter.patch(
  "/:id/status",
  validateBody(purchaseOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as { status: "received" | "cancelled" };
    if (status === "received") {
      const received = await receivePurchaseOrder(req.params.id);
      res.json(toPurchaseOrderDTO(received));
      return;
    }
    const po = await findPurchaseOrder(req.params.id);
    if (po.status !== "pending") {
      throw new HttpError(400, "Só é possível cancelar compras pendentes.");
    }
    po.status = "cancelled";
    await purchaseOrderRepo().save(po);
    res.json(toPurchaseOrderDTO(po));
  }),
);

purchaseOrdersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const po = await findPurchaseOrder(req.params.id);
    if (po.status === "received") {
      throw new HttpError(400, "Compras recebidas não podem ser excluídas, apenas estornadas por ajuste.");
    }
    await purchaseOrderRepo().remove(po);
    res.status(204).send();
  }),
);
