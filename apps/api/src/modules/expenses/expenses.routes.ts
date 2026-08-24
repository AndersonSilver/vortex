import { Router } from "express";
import {
  expenseEntrySchema,
  postMonthSchema,
  type ExpenseEntryInput,
  type ExpenseSource,
  type PostMonthInput,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { ExpenseEntry } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { applySuggestedCostRates, getCostRates } from "./cost-rates.service";
import {
  getExpenseSummary,
  listExpenses,
  postMonth,
  recordExpense,
  toExpenseEntryDTO,
} from "./expense-ledger.service";

export const expensesRouter = Router();

const entryRepo = () => AppDataSource.getRepository(ExpenseEntry);

function defaultRange(query: { from?: string; to?: string }): { from: string; to: string } {
  const to = query.to ?? new Date().toISOString().slice(0, 10);
  const fromDate = new Date(`${to}T00:00:00Z`);
  fromDate.setUTCMonth(fromDate.getUTCMonth() - 5);
  fromDate.setUTCDate(1);
  const from = query.from ?? fromDate.toISOString().slice(0, 10);
  return { from, to };
}

expensesRouter.use(requireAuth, requireRole("admin"));

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = req.query as { from?: string; to?: string; categoryId?: string; source?: ExpenseSource };
    const { from, to } = defaultRange(query);
    res.json(await listExpenses({ from, to, categoryId: query.categoryId, source: query.source }));
  }),
);

expensesRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { from, to } = defaultRange(req.query as { from?: string; to?: string });
    res.json(await getExpenseSummary(from, to));
  }),
);

expensesRouter.get(
  "/cost-rates",
  asyncHandler(async (_req, res) => {
    res.json(await getCostRates());
  }),
);

expensesRouter.post(
  "/cost-rates/apply",
  asyncHandler(async (_req, res) => {
    res.json(await applySuggestedCostRates());
  }),
);

/** Gera as despesas fixas e a depreciação do mês informado. */
expensesRouter.post(
  "/post-month",
  validateBody(postMonthSchema),
  asyncHandler(async (req, res) => {
    const { month } = req.body as PostMonthInput;
    res.json(await postMonth(month));
  }),
);

expensesRouter.post(
  "/",
  validateBody(expenseEntrySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ExpenseEntryInput;
    const entry = await recordExpense({ ...body, source: "manual" });
    res.status(201).json(toExpenseEntryDTO(await entryRepo().findOneOrFail({ where: { id: entry.id } })));
  }),
);

expensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const entry = await entryRepo().findOneBy({ id: req.params.id });
    if (!entry) {
      throw new HttpError(404, "Lançamento não encontrado.");
    }
    if (entry.source !== "manual") {
      throw new HttpError(
        400,
        "Só lançamentos manuais podem ser excluídos. Estorne pela compra, despesa fixa ou ativo de origem.",
      );
    }
    await entryRepo().remove(entry);
    res.status(204).send();
  }),
);
