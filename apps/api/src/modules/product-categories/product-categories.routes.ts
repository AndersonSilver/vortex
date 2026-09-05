import { Router } from "express";
import { productCategorySchema, type ProductCategoryDTO, type ProductCategoryInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Product, ProductCategory } from "../../entities";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { slugify, uniqueSlug } from "../../utils/slug";

export const productCategoriesRouter = Router();

const categoryRepo = () => AppDataSource.getRepository(ProductCategory);
const productRepo = () => AppDataSource.getRepository(Product);

/** Quantos produtos usam cada slug, ativos e inativos, para saber o que pode ser excluído. */
async function productCountsBySlug(): Promise<Map<string, number>> {
  const rows = await productRepo()
    .createQueryBuilder("product")
    .select("product.category", "slug")
    .addSelect("COUNT(*)", "count")
    .groupBy("product.category")
    .getRawMany<{ slug: string; count: string }>();
  return new Map(rows.map((row) => [row.slug, Number(row.count)]));
}

export function toProductCategoryDTO(category: ProductCategory, productsCount = 0): ProductCategoryDTO {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    emoji: category.emoji,
    sortOrder: category.sortOrder,
    active: category.active,
    productsCount,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

productCategoriesRouter.get(
  "/",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    // A lista completa é coisa do admin.
    const isAdminListing = includeInactive === "true" && req.auth?.role === "admin";
    const categories = await categoryRepo().find({ order: { sortOrder: "ASC", name: "ASC" } });
    const counts = await productCountsBySlug();
    const visible = isAdminListing
      ? categories
      : // A vitrine recebe as ativas mais as desativadas que ainda rotulam algum produto —
        // sem elas o card do produto cairia no slug cru em vez do nome da categoria.
        categories.filter((category) => category.active || (counts.get(category.slug) ?? 0) > 0);
    res.json(visible.map((category) => toProductCategoryDTO(category, counts.get(category.slug) ?? 0)));
  }),
);

productCategoriesRouter.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(productCategorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ProductCategoryInput;
    const baseSlug = slugify(body.name);
    if (!baseSlug) {
      throw new HttpError(400, "O nome da categoria precisa ter letras ou números.");
    }
    const slug = await uniqueSlug(baseSlug, async (candidate) => !!(await categoryRepo().findOneBy({ slug: candidate })));
    const category = await categoryRepo().save(categoryRepo().create({ ...body, slug }));
    res.status(201).json(toProductCategoryDTO(category));
  }),
);

productCategoriesRouter.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateBody(productCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await categoryRepo().findOneBy({ id: req.params.id });
    if (!category) {
      throw new HttpError(404, "Categoria não encontrada.");
    }
    const body = req.body as ProductCategoryInput;
    // O slug fica de fora de propósito: ele é o que os produtos já gravaram em products.category,
    // então renomear a categoria muda só o rótulo, sem mexer em produto nenhum.
    category.name = body.name;
    category.emoji = body.emoji;
    category.sortOrder = body.sortOrder;
    category.active = body.active;
    await categoryRepo().save(category);
    const counts = await productCountsBySlug();
    res.json(toProductCategoryDTO(category, counts.get(category.slug) ?? 0));
  }),
);

productCategoriesRouter.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const category = await categoryRepo().findOneBy({ id: req.params.id });
    if (!category) {
      throw new HttpError(404, "Categoria não encontrada.");
    }
    const inUse = await productRepo().countBy({ category: category.slug });
    if (inUse > 0) {
      // Nunca deixa produto órfão: categoria em uso só sai da vitrine.
      category.active = false;
      await categoryRepo().save(category);
      res.status(204).send();
      return;
    }
    await categoryRepo().remove(category);
    res.status(204).send();
  }),
);
