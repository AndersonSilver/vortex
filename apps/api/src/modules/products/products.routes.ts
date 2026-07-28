import { Router } from "express";
import { productSchema, type ProductDTO, type ProductCategoryKey, type ProductInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Product } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const productsRouter = Router();

const productRepo = () => AppDataSource.getRepository(Product);

export function toProductDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    price: Number(product.price),
    oldPrice: product.oldPrice !== null && product.oldPrice !== undefined ? Number(product.oldPrice) : null,
    emoji: product.emoji,
    imageUrl: product.imageUrl ?? null,
    videoUrl: product.videoUrl ?? null,
    badge: product.badge ?? null,
    colors: product.colors,
    material: product.material,
    specs: product.specs,
    rating: Number(product.rating),
    reviewsCount: product.reviewsCount,
    stock: product.stock,
    active: product.active,
  };
}

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, includeInactive } = req.query as {
      category?: ProductCategoryKey;
      includeInactive?: string;
    };
    const where: Record<string, unknown> = {};
    if (category && category !== ("all" as ProductCategoryKey)) {
      where.category = category;
    }
    if (includeInactive !== "true") {
      where.active = true;
    }
    const products = await productRepo().find({ where, order: { createdAt: "DESC", id: "ASC" } });
    res.json(products.map(toProductDTO));
  }),
);

productsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const product = await productRepo().findOneBy({ slug: req.params.slug });
    if (!product) {
      throw new HttpError(404, "Produto não encontrado.");
    }
    res.json(toProductDTO(product));
  }),
);

productsRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const baseSlug = slugify(req.body.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await productRepo().findOneBy({ slug })) {
      slug = `${baseSlug}-${++suffix}`;
    }
    const body = req.body as ProductInput;
    const product = await productRepo().save(productRepo().create({ ...body, slug }));
    res.status(201).json(toProductDTO(product));
  }),
);

productsRouter.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(productSchema),
  asyncHandler(async (req, res) => {
    const product = await productRepo().findOneBy({ id: req.params.id });
    if (!product) {
      throw new HttpError(404, "Produto não encontrado.");
    }
    Object.assign(product, req.body);
    await productRepo().save(product);
    res.json(toProductDTO(product));
  }),
);

productsRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const product = await productRepo().findOneBy({ id: req.params.id });
    if (!product) {
      throw new HttpError(404, "Produto não encontrado.");
    }
    product.active = false;
    await productRepo().save(product);
    res.status(204).send();
  }),
);

productsRouter.patch(
  "/:id/toggle",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const product = await productRepo().findOneBy({ id: req.params.id });
    if (!product) {
      throw new HttpError(404, "Produto não encontrado.");
    }
    product.active = !product.active;
    await productRepo().save(product);
    res.json(toProductDTO(product));
  }),
);
