import { Router } from "express";
import { shippingQuoteSchema } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { CartItem } from "../../entities";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { quoteShipping } from "./shipping-provider.service";

export const shippingRouter = Router();
shippingRouter.use(requireAuth);

const cartRepo = () => AppDataSource.getRepository(CartItem);

const WEIGHT_PER_UNIT_KG = 0.25;
const BASE_DIMENSIONS_CM = { lengthCm: 20, widthCm: 15, heightCm: 10 };

shippingRouter.post(
  "/quote",
  validateBody(shippingQuoteSchema),
  asyncHandler(async (req, res) => {
    const items = await cartRepo().find({ where: { userId: req.auth!.userId } });
    const totalQty = items.reduce((sum, item) => sum + item.qty, 0) || 1;
    const options = await quoteShipping(req.body.cepDestino, {
      weightKg: totalQty * WEIGHT_PER_UNIT_KG,
      ...BASE_DIMENSIONS_CM,
      heightCm: Math.min(60, BASE_DIMENSIONS_CM.heightCm + totalQty * 2),
    });
    res.json(options);
  }),
);
