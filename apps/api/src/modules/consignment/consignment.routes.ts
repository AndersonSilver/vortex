import { Router } from "express";
import {
  CONSIGNMENT_MOVEMENT_TYPES,
  consignmentRequestSchema,
  consignmentSaleSchema,
  type ConsignmentMovementType,
  type ConsignmentRequestInput,
  type ConsignmentSaleInput,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { applyConsignmentMovement } from "./consignment-stock.service";
import {
  cancelRequest,
  createRequest,
  getFinancial,
  getSummary,
  listCatalog,
  listMovements,
  listRequests,
  listStock,
  resolveMyStore,
} from "./consignment.service";

/**
 * Painel da loja consignada. A loja sai sempre do usuário logado (resolveMyStore), nunca
 * da URL, então um consignado não tem como enxergar outra loja.
 */
export const consignmentRouter = Router();

consignmentRouter.use(requireAuth, requireRole("consignado"));

consignmentRouter.get(
  "/me/summary",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await getSummary(store));
  }),
);

consignmentRouter.get(
  "/me/stock",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await listStock(store.id));
  }),
);

consignmentRouter.post(
  "/me/sales",
  validateBody(consignmentSaleSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    const body = req.body as ConsignmentSaleInput;
    await AppDataSource.transaction(async (manager) => {
      for (const item of body.items) {
        await applyConsignmentMovement(manager, store.id, item.productId, "sale", -item.qty, {
          note: body.note ?? null,
          userId: req.auth!.userId,
        });
      }
    });
    res.status(201).json(await getSummary(store));
  }),
);

consignmentRouter.get(
  "/me/movements",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    const { type, productId, from, to } = req.query as Record<string, string | undefined>;
    res.json(
      await listMovements(store.id, {
        type: CONSIGNMENT_MOVEMENT_TYPES.includes(type as ConsignmentMovementType)
          ? (type as ConsignmentMovementType)
          : undefined,
        productId: productId || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    );
  }),
);

consignmentRouter.get(
  "/me/financial",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await getFinancial(store.id));
  }),
);

consignmentRouter.get(
  "/me/catalog",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await listCatalog(store.id));
  }),
);

consignmentRouter.get(
  "/me/requests",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await listRequests({ storeId: store.id }));
  }),
);

consignmentRouter.post(
  "/me/requests",
  validateBody(consignmentRequestSchema),
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.status(201).json(await createRequest(store.id, req.auth!.userId, req.body as ConsignmentRequestInput));
  }),
);

consignmentRouter.patch(
  "/me/requests/:id/cancel",
  asyncHandler(async (req, res) => {
    const store = await resolveMyStore(req);
    res.json(await cancelRequest(store.id, req.params.id));
  }),
);
