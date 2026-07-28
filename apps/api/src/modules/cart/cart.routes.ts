import { Router } from "express";
import { cartAddItemSchema, cartUpdateItemSchema, type CartItemDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { CartItem, Product } from "../../entities";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { toProductDTO } from "../products/products.routes";

export const cartRouter = Router();
cartRouter.use(requireAuth);

const cartRepo = () => AppDataSource.getRepository(CartItem);
const productRepo = () => AppDataSource.getRepository(Product);

function toCartItemDTO(item: CartItem): CartItemDTO {
  return {
    id: item.id,
    product: toProductDTO(item.product),
    qty: item.qty,
    color: item.color,
    material: item.material,
  };
}

cartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await cartRepo().find({
      where: { userId: req.auth!.userId },
      order: { createdAt: "ASC" },
    });
    res.json(items.map(toCartItemDTO));
  }),
);

cartRouter.post(
  "/items",
  validateBody(cartAddItemSchema),
  asyncHandler(async (req, res) => {
    const { productId, qty, color, material } = req.body;
    const product = await productRepo().findOneBy({ id: productId, active: true });
    if (!product) {
      throw new HttpError(404, "Produto não encontrado.");
    }
    let item = await cartRepo().findOne({
      where: { userId: req.auth!.userId, productId, color, material },
      relations: { product: true },
    });
    if (item) {
      item.qty += qty;
    } else {
      item = cartRepo().create({ userId: req.auth!.userId, productId, qty, color, material });
    }
    await cartRepo().save(item);
    item.product = product;
    res.status(201).json(toCartItemDTO(item));
  }),
);

cartRouter.put(
  "/items/:id",
  validateBody(cartUpdateItemSchema),
  asyncHandler(async (req, res) => {
    const item = await cartRepo().findOne({
      where: { id: req.params.id, userId: req.auth!.userId },
      relations: { product: true },
    });
    if (!item) {
      throw new HttpError(404, "Item do carrinho não encontrado.");
    }
    item.qty = req.body.qty;
    await cartRepo().save(item);
    res.json(toCartItemDTO(item));
  }),
);

cartRouter.delete(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const item = await cartRepo().findOneBy({ id: req.params.id, userId: req.auth!.userId });
    if (!item) {
      throw new HttpError(404, "Item do carrinho não encontrado.");
    }
    await cartRepo().remove(item);
    res.status(204).send();
  }),
);

cartRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await cartRepo().delete({ userId: req.auth!.userId });
    res.status(204).send();
  }),
);
