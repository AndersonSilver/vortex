import { Router } from "express";
import { applyCouponSchema, couponSchema, type CouponDTO, type CouponInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { CartItem, Coupon } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { calculateDiscount, calculateSubtotal, isCouponUsable } from "../../utils/pricing";

export const couponsRouter = Router();

const couponRepo = () => AppDataSource.getRepository(Coupon);
const cartRepo = () => AppDataSource.getRepository(CartItem);

export function toCouponDTO(coupon: Coupon): CouponDTO {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    minOrder: Number(coupon.minOrder),
    uses: coupon.uses,
    maxUses: coupon.maxUses,
    expiresAt: coupon.expiresAt,
    active: coupon.active,
  };
}

couponsRouter.post(
  "/apply",
  requireAuth,
  validateBody(applyCouponSchema),
  asyncHandler(async (req, res) => {
    const code = req.body.code.toUpperCase().trim();
    const coupon = await couponRepo().findOneBy({ code });
    if (!coupon) {
      throw new HttpError(404, "Cupom inválido ou expirado.");
    }
    const items = await cartRepo().find({
      where: { userId: req.auth!.userId },
      relations: { product: true },
    });
    const subtotal = calculateSubtotal(items.map((i) => ({ price: Number(i.product.price), qty: i.qty })));
    const usable = isCouponUsable(coupon, subtotal);
    if (!usable.ok) {
      throw new HttpError(400, usable.reason);
    }
    const discount = coupon.type === "free_shipping" ? 0 : calculateDiscount(coupon, subtotal, 0);
    res.json({ coupon: toCouponDTO(coupon), subtotal, discount });
  }),
);

couponsRouter.get(
  "/",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const coupons = await couponRepo().find({ order: { createdAt: "DESC" } });
    res.json(coupons.map(toCouponDTO));
  }),
);

couponsRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(couponSchema),
  asyncHandler(async (req, res) => {
    const existing = await couponRepo().findOneBy({ code: req.body.code });
    if (existing) {
      throw new HttpError(409, "Já existe um cupom com este código.");
    }
    const coupon = await couponRepo().save(couponRepo().create(req.body as CouponInput));
    res.status(201).json(toCouponDTO(coupon));
  }),
);

couponsRouter.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(couponSchema),
  asyncHandler(async (req, res) => {
    const coupon = await couponRepo().findOneBy({ id: req.params.id });
    if (!coupon) {
      throw new HttpError(404, "Cupom não encontrado.");
    }
    Object.assign(coupon, req.body);
    await couponRepo().save(coupon);
    res.json(toCouponDTO(coupon));
  }),
);

couponsRouter.patch(
  "/:id/toggle",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const coupon = await couponRepo().findOneBy({ id: req.params.id });
    if (!coupon) {
      throw new HttpError(404, "Cupom não encontrado.");
    }
    coupon.active = !coupon.active;
    await couponRepo().save(coupon);
    res.json(toCouponDTO(coupon));
  }),
);

couponsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const coupon = await couponRepo().findOneBy({ id: req.params.id });
    if (!coupon) {
      throw new HttpError(404, "Cupom não encontrado.");
    }
    await couponRepo().remove(coupon);
    res.status(204).send();
  }),
);
