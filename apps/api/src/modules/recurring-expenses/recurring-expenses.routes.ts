import { Router } from "express";
import { recurringExpenseSchema, type RecurringExpenseDTO, type RecurringExpenseInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { RecurringExpense } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { normalizedMonthlyAmount } from "../expenses/expense-ledger.service";

export const recurringExpensesRouter = Router();

const recurringRepo = () => AppDataSource.getRepository(RecurringExpense);

export function toRecurringExpenseDTO(expense: RecurringExpense): RecurringExpenseDTO {
  return {
    id: expense.id,
    name: expense.name,
    categoryId: expense.categoryId,
    categoryName: expense.category?.name ?? "",
    amount: Number(expense.amount),
    period: expense.period,
    dueDay: expense.dueDay ?? null,
    startDate: expense.startDate,
    endDate: expense.endDate ?? null,
    supplierId: expense.supplierId ?? null,
    supplierName: expense.supplier?.name ?? null,
    paymentMethod: expense.paymentMethod ?? null,
    notes: expense.notes ?? null,
    active: expense.active,
    monthlyAmount: Number(normalizedMonthlyAmount(expense).toFixed(2)),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

recurringExpensesRouter.use(requireAuth, requireRole("admin"));

recurringExpensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const expenses = await recurringRepo().find({ where, order: { name: "ASC" } });
    res.json(expenses.map(toRecurringExpenseDTO));
  }),
);

recurringExpensesRouter.post(
  "/",
  validateBody(recurringExpenseSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as RecurringExpenseInput;
    const expense = await recurringRepo().save(recurringRepo().create({ ...body }));
    res.status(201).json(toRecurringExpenseDTO(await recurringRepo().findOneByOrFail({ id: expense.id })));
  }),
);

recurringExpensesRouter.put(
  "/:id",
  validateBody(recurringExpenseSchema),
  asyncHandler(async (req, res) => {
    const expense = await recurringRepo().findOneBy({ id: req.params.id });
    if (!expense) {
      throw new HttpError(404, "Despesa fixa não encontrada.");
    }
    Object.assign(expense, req.body as RecurringExpenseInput);
    await recurringRepo().save(expense);
    res.json(toRecurringExpenseDTO(await recurringRepo().findOneByOrFail({ id: expense.id })));
  }),
);

recurringExpensesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await recurringRepo().findOneBy({ id: req.params.id });
    if (!expense) {
      throw new HttpError(404, "Despesa fixa não encontrada.");
    }
    expense.active = false;
    await recurringRepo().save(expense);
    res.status(204).send();
  }),
);
