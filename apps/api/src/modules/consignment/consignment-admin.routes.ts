import { Router } from "express";
import {
  CONSIGNMENT_MOVEMENT_TYPES,
  CONSIGNMENT_REQUEST_STATUSES,
  consignmentAdjustmentSchema,
  consignmentLinkUserSchema,
  consignmentPaymentSchema,
  consignmentRequestApproveSchema,
  consignmentRequestRejectSchema,
  consignmentReturnSchema,
  consignmentShipmentSchema,
  consignmentStoreSchema,
  consignmentTransferPriceSchema,
  type ConsignmentAdjustmentInput,
  type ConsignmentLinkUserInput,
  type ConsignmentMovementType,
  type ConsignmentPaymentInput,
  type ConsignmentRequestApproveInput,
  type ConsignmentRequestRejectInput,
  type ConsignmentReturnInput,
  type ConsignmentShipmentInput,
  type ConsignmentStoreInput,
  type ConsignmentTransferPriceInput,
  type ConsignmentUserDTO,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { ConsignmentPayment, ConsignmentStock, ConsignmentStore, User } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { applyConsignmentMovement } from "./consignment-stock.service";
import {
  approveRequest,
  getFinancial,
  getStoreOrFail,
  listMovements,
  listRequests,
  listStock,
  listStoreSummaries,
  rejectRequest,
  shipRequest,
  toStockDTO,
  toStoreDTO,
} from "./consignment.service";

/** Gestão das lojas consignadas pelo admin da Vortex. */
export const consignmentAdminRouter = Router();

const storeRepo = () => AppDataSource.getRepository(ConsignmentStore);
const userRepo = () => AppDataSource.getRepository(User);

consignmentAdminRouter.use(requireAuth, requireRole("admin"));

// --- Lojas -----------------------------------------------------------------------

consignmentAdminRouter.get(
  "/stores",
  asyncHandler(async (_req, res) => {
    res.json(await listStoreSummaries());
  }),
);

consignmentAdminRouter.get(
  "/stores/:id",
  asyncHandler(async (req, res) => {
    res.json(toStoreDTO(await getStoreOrFail(req.params.id)));
  }),
);

consignmentAdminRouter.post(
  "/stores",
  validateBody(consignmentStoreSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ConsignmentStoreInput;
    const store = await storeRepo().save(storeRepo().create(body));
    res.status(201).json(toStoreDTO(store));
  }),
);

consignmentAdminRouter.put(
  "/stores/:id",
  validateBody(consignmentStoreSchema),
  asyncHandler(async (req, res) => {
    const store = await getStoreOrFail(req.params.id);
    Object.assign(store, req.body as ConsignmentStoreInput);
    res.json(toStoreDTO(await storeRepo().save(store)));
  }),
);

// --- Usuários da loja --------------------------------------------------------------

consignmentAdminRouter.get(
  "/stores/:id/users",
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const users = await userRepo().find({ where: { consignmentStoreId: req.params.id }, order: { name: "ASC" } });
    res.json(users.map((u): ConsignmentUserDTO => ({ id: u.id, name: u.name, email: u.email })));
  }),
);

/** Liga um usuário que já tem conta no site (cadastro ou Google) à loja e troca o perfil dele. */
consignmentAdminRouter.post(
  "/stores/:id/users",
  validateBody(consignmentLinkUserSchema),
  asyncHandler(async (req, res) => {
    const store = await getStoreOrFail(req.params.id);
    const { email } = req.body as ConsignmentLinkUserInput;
    const user = await userRepo()
      .createQueryBuilder("u")
      .where("LOWER(u.email) = LOWER(:email)", { email })
      .getOne();
    if (!user) {
      throw new HttpError(404, "Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar no site antes.");
    }
    if (user.role === "admin") {
      throw new HttpError(400, "Esse usuário é admin da Vortex e não pode virar consignado.");
    }
    if (user.consignmentStoreId && user.consignmentStoreId !== store.id) {
      throw new HttpError(409, "Esse usuário já está ligado a outra loja consignada.");
    }
    await userRepo().update({ id: user.id }, { role: "consignado", consignmentStoreId: store.id });
    res.status(201).json({ id: user.id, name: user.name, email: user.email } satisfies ConsignmentUserDTO);
  }),
);

consignmentAdminRouter.delete(
  "/stores/:id/users/:userId",
  asyncHandler(async (req, res) => {
    const user = await userRepo().findOneBy({ id: req.params.userId, consignmentStoreId: req.params.id });
    if (!user) {
      throw new HttpError(404, "Usuário não está ligado a essa loja.");
    }
    await userRepo().update({ id: user.id }, { role: "customer", consignmentStoreId: null });
    res.status(204).end();
  }),
);

// --- Estoque da loja ---------------------------------------------------------------

consignmentAdminRouter.get(
  "/stores/:id/stock",
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    res.json(await listStock(req.params.id));
  }),
);

consignmentAdminRouter.put(
  "/stores/:id/stock/:productId",
  validateBody(consignmentTransferPriceSchema),
  asyncHandler(async (req, res) => {
    const repo = AppDataSource.getRepository(ConsignmentStock);
    const stock = await repo.findOneBy({ storeId: req.params.id, productId: req.params.productId });
    if (!stock) {
      throw new HttpError(404, "A loja não trabalha com esse produto. Faça um envio primeiro.");
    }
    stock.transferPrice = (req.body as ConsignmentTransferPriceInput).transferPrice;
    res.json(toStockDTO(await repo.save(stock)));
  }),
);

consignmentAdminRouter.post(
  "/stores/:id/shipments",
  validateBody(consignmentShipmentSchema),
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const body = req.body as ConsignmentShipmentInput;
    await AppDataSource.transaction(async (manager) => {
      for (const item of body.items) {
        await applyConsignmentMovement(manager, req.params.id, item.productId, "shipment", item.qty, {
          transferPrice: item.transferPrice ?? null,
          note: body.note ?? null,
          userId: req.auth!.userId,
        });
      }
    });
    res.status(201).json(await listStock(req.params.id));
  }),
);

consignmentAdminRouter.post(
  "/stores/:id/returns",
  validateBody(consignmentReturnSchema),
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const body = req.body as ConsignmentReturnInput;
    await AppDataSource.transaction(async (manager) => {
      for (const item of body.items) {
        await applyConsignmentMovement(manager, req.params.id, item.productId, "return", -item.qty, {
          note: body.note ?? null,
          userId: req.auth!.userId,
        });
      }
    });
    res.status(201).json(await listStock(req.params.id));
  }),
);

consignmentAdminRouter.post(
  "/stores/:id/adjustments",
  validateBody(consignmentAdjustmentSchema),
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const body = req.body as ConsignmentAdjustmentInput;
    await AppDataSource.transaction((manager) =>
      applyConsignmentMovement(manager, req.params.id, body.productId, "adjustment", body.changeQuantity, {
        note: body.note,
        userId: req.auth!.userId,
      }),
    );
    res.status(201).json(await listStock(req.params.id));
  }),
);

consignmentAdminRouter.get(
  "/stores/:id/movements",
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const { type, productId, from, to } = req.query as Record<string, string | undefined>;
    res.json(
      await listMovements(req.params.id, {
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

// --- Financeiro --------------------------------------------------------------------

consignmentAdminRouter.get(
  "/stores/:id/financial",
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    res.json(await getFinancial(req.params.id));
  }),
);

consignmentAdminRouter.post(
  "/stores/:id/payments",
  validateBody(consignmentPaymentSchema),
  asyncHandler(async (req, res) => {
    await getStoreOrFail(req.params.id);
    const body = req.body as ConsignmentPaymentInput;
    const repo = AppDataSource.getRepository(ConsignmentPayment);
    await repo.save(
      repo.create({
        storeId: req.params.id,
        amount: body.amount,
        paidAt: body.paidAt,
        method: body.method,
        note: body.note ?? null,
        createdByUserId: req.auth!.userId,
      }),
    );
    res.status(201).json(await getFinancial(req.params.id));
  }),
);

consignmentAdminRouter.delete(
  "/stores/:id/payments/:paymentId",
  asyncHandler(async (req, res) => {
    const result = await AppDataSource.getRepository(ConsignmentPayment).delete({
      id: req.params.paymentId,
      storeId: req.params.id,
    });
    if (!result.affected) {
      throw new HttpError(404, "Pagamento não encontrado.");
    }
    res.json(await getFinancial(req.params.id));
  }),
);

// --- Pedidos de reposição -----------------------------------------------------------

consignmentAdminRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const { status, storeId } = req.query as Record<string, string | undefined>;
    res.json(
      await listRequests({
        status: CONSIGNMENT_REQUEST_STATUSES.includes(status as never) ? status : undefined,
        storeId: storeId || undefined,
      }),
    );
  }),
);

consignmentAdminRouter.patch(
  "/requests/:id/approve",
  validateBody(consignmentRequestApproveSchema),
  asyncHandler(async (req, res) => {
    res.json(await approveRequest(req.params.id, req.body as ConsignmentRequestApproveInput));
  }),
);

consignmentAdminRouter.patch(
  "/requests/:id/reject",
  validateBody(consignmentRequestRejectSchema),
  asyncHandler(async (req, res) => {
    res.json(await rejectRequest(req.params.id, (req.body as ConsignmentRequestRejectInput).adminNote));
  }),
);

consignmentAdminRouter.patch(
  "/requests/:id/ship",
  asyncHandler(async (req, res) => {
    res.json(await shipRequest(req.params.id, req.auth!.userId));
  }),
);
