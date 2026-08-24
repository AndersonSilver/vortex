import { Router } from "express";
import { expenseCategorySchema, type ExpenseCategoryDTO, type ExpenseCategoryInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { ExpenseCategory, ExpenseEntry } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const expenseCategoriesRouter = Router();

const categoryRepo = () => AppDataSource.getRepository(ExpenseCategory);
const entryRepo = () => AppDataSource.getRepository(ExpenseEntry);

export function toExpenseCategoryDTO(category: ExpenseCategory): ExpenseCategoryDTO {
  return {
    id: category.id,
    name: category.name,
    kind: category.kind,
    target: category.target,
    emoji: category.emoji,
    system: category.system,
    active: category.active,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

expenseCategoriesRouter.use(requireAuth, requireRole("admin"));

expenseCategoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const categories = await categoryRepo().find({ where, order: { kind: "ASC", name: "ASC" } });
    res.json(categories.map(toExpenseCategoryDTO));
  }),
);

expenseCategoriesRouter.post(
  "/",
  validateBody(expenseCategorySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ExpenseCategoryInput;
    const category = await categoryRepo().save(categoryRepo().create({ ...body, system: false }));
    res.status(201).json(toExpenseCategoryDTO(category));
  }),
);

expenseCategoriesRouter.put(
  "/:id",
  validateBody(expenseCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await categoryRepo().findOneBy({ id: req.params.id });
    if (!category) {
      throw new HttpError(404, "Categoria não encontrada.");
    }
    const body = req.body as ExpenseCategoryInput;
    // Categorias do sistema mantêm o comportamento de custo e o destino de estoque,
    // porque os lançamentos e o rateio de preço dependem deles.
    if (category.system) {
      category.name = body.name;
      category.emoji = body.emoji;
      category.active = body.active;
    } else {
      Object.assign(category, body);
    }
    await categoryRepo().save(category);
    res.json(toExpenseCategoryDTO(category));
  }),
);

expenseCategoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const category = await categoryRepo().findOneBy({ id: req.params.id });
    if (!category) {
      throw new HttpError(404, "Categoria não encontrada.");
    }
    const inUse = await entryRepo().countBy({ categoryId: category.id });
    if (category.system || inUse > 0) {
      // Nunca apaga histórico: categoria em uso só sai de circulação.
      category.active = false;
      await categoryRepo().save(category);
      res.status(204).send();
      return;
    }
    await categoryRepo().remove(category);
    res.status(204).send();
  }),
);
