import { Router } from "express";
import {
  createManualOrderSchema,
  createOrderSchema,
  updateManualOrderDiscountSchema,
  updateOrderStatusSchema,
  updateOrderTrackingSchema,
} from "@vortex/shared";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import * as ordersService from "./orders.service";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.post(
  "/",
  validateBody(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await ordersService.createOrder(req.auth!.userId, req.body);
    res.status(201).json(order);
  }),
);

ordersRouter.post(
  "/manual",
  requireRole("admin"),
  validateBody(createManualOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await ordersService.createManualOrder(req.body);
    res.status(201).json(order);
  }),
);

ordersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.auth!.role === "admin") {
      const status = req.query.status as string | undefined;
      res.json(await ordersService.listAllOrders(status));
      return;
    }
    res.json(await ordersService.listOrdersForUser(req.auth!.userId));
  }),
);

ordersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.auth!.role === "admin") {
      const order = await ordersService.getOrderById(req.params.id);
      res.json(ordersService.toOrderDTO(order));
      return;
    }
    res.json(await ordersService.getOrderByIdForUser(req.auth!.userId, req.params.id));
  }),
);

ordersRouter.patch(
  "/:id/status",
  requireRole("admin"),
  validateBody(updateOrderStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await ordersService.updateOrderStatus(req.params.id, req.body.status);
    res.json(order);
  }),
);

ordersRouter.patch(
  "/:id/viewed",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const order = await ordersService.markOrderViewed(req.params.id);
    res.json(order);
  }),
);

ordersRouter.patch(
  "/:id/tracking",
  requireRole("admin"),
  validateBody(updateOrderTrackingSchema),
  asyncHandler(async (req, res) => {
    const order = await ordersService.updateOrderTracking(
      req.params.id,
      req.body.trackingCode,
      req.body.trackingUrl,
    );
    res.json(order);
  }),
);

ordersRouter.patch(
  "/:id/manual-discount",
  requireRole("admin"),
  validateBody(updateManualOrderDiscountSchema),
  asyncHandler(async (req, res) => {
    const order = await ordersService.updateManualOrderDiscount(req.params.id, req.body);
    res.json(order);
  }),
);
