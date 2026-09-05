import { Router } from "express";
import { productSchema, type ProductDTO, type ProductInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Product, ProductCategory } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { slugify, uniqueSlug } from "../../utils/slug";

export const productsRouter = Router();

const productRepo = () => AppDataSource.getRepository(Product);
const categoryRepo = () => AppDataSource.getRepository(ProductCategory);

export function toProductDTO(product: Product): ProductDTO {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku ?? null,
    marketplaceAliases: product.marketplaceAliases ?? [],
    name: product.name,
    category: product.category,
    description: product.description,
    price: Number(product.price),
    oldPrice: product.oldPrice !== null && product.oldPrice !== undefined ? Number(product.oldPrice) : null,
    emoji: product.emoji,
    imageUrl: product.imageUrl ?? null,
    images: product.images ?? [],
    videoUrl: product.videoUrl ?? null,
    badge: product.badge ?? null,
    colors: product.colors,
    material: product.material,
    specs: product.specs,
    rating: Number(product.rating),
    reviewsCount: product.reviewsCount,
    stock: product.stock,
    active: product.active,
    filamentId: product.filamentId ?? null,
    weightGrams: product.weightGrams ?? null,
    printTimeMinutes: product.printTimeMinutes ?? null,
    costPrice: product.costPrice !== null && product.costPrice !== undefined ? Number(product.costPrice) : null,
  };
}

/** O produto guarda o slug da categoria, então ela precisa existir antes de gravar. */
async function assertCategoryExists(slug: string): Promise<void> {
  if (!(await categoryRepo().findOneBy({ slug }))) {
    throw new HttpError(400, "Categoria de produto não encontrada.");
  }
}

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, includeInactive } = req.query as {
      category?: string;
      includeInactive?: string;
    };
    const where: Record<string, unknown> = {};
    if (category && category !== "all") {
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
    const body = req.body as ProductInput;
    await assertCategoryExists(body.category);
    const slug = await uniqueSlug(slugify(body.name), async (candidate) => !!(await productRepo().findOneBy({ slug: candidate })));
    const imageUrl = body.images.length > 0 ? body.images[0] : (body.imageUrl ?? null);
    const product = await productRepo().save(productRepo().create({ ...body, imageUrl, slug }));
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
    const body = req.body as ProductInput;
    await assertCategoryExists(body.category);
    const imageUrl = body.images.length > 0 ? body.images[0] : (body.imageUrl ?? null);
    Object.assign(product, body, { imageUrl });
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
