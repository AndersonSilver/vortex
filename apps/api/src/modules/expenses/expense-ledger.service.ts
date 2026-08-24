import { Between, type EntityManager, type FindOptionsWhere } from "typeorm";
import {
  EXPENSE_CATEGORY_KINDS,
  EXPENSE_SOURCES,
  type ExpenseByCategoryDTO,
  type ExpenseCategoryKind,
  type ExpenseEntryDTO,
  type ExpensePaymentMethod,
  type ExpenseSource,
  type ExpenseSummaryDTO,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Asset, ExpenseEntry, RecurringExpense } from "../../entities";

const entryRepo = (manager?: EntityManager) => (manager ?? AppDataSource.manager).getRepository(ExpenseEntry);
const assetRepo = (manager?: EntityManager) => (manager ?? AppDataSource.manager).getRepository(Asset);
const recurringRepo = (manager?: EntityManager) => (manager ?? AppDataSource.manager).getRepository(RecurringExpense);

export function toExpenseEntryDTO(entry: ExpenseEntry): ExpenseEntryDTO {
  return {
    id: entry.id,
    categoryId: entry.categoryId,
    categoryName: entry.category?.name ?? "",
    categoryKind: entry.category?.kind ?? "indirect_fixed",
    description: entry.description,
    amount: Number(entry.amount),
    incurredAt: entry.incurredAt,
    source: entry.source,
    supplierId: entry.supplierId ?? null,
    supplierName: entry.supplier?.name ?? null,
    purchaseOrderId: entry.purchaseOrderId ?? null,
    recurringExpenseId: entry.recurringExpenseId ?? null,
    assetId: entry.assetId ?? null,
    paymentMethod: entry.paymentMethod ?? null,
    attachmentUrl: entry.attachmentUrl ?? null,
    notes: entry.notes ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}

export interface RecordExpenseInput {
  categoryId: string;
  description: string;
  amount: number;
  incurredAt: string;
  source: ExpenseSource;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  recurringExpenseId?: string | null;
  assetId?: string | null;
  periodKey?: string | null;
  paymentMethod?: ExpensePaymentMethod | null;
  attachmentUrl?: string | null;
  notes?: string | null;
}

export async function recordExpense(input: RecordExpenseInput, manager?: EntityManager): Promise<ExpenseEntry> {
  const repo = entryRepo(manager);
  return repo.save(
    repo.create({
      categoryId: input.categoryId,
      description: input.description,
      amount: Number(input.amount.toFixed(2)),
      incurredAt: input.incurredAt,
      source: input.source,
      supplierId: input.supplierId ?? null,
      purchaseOrderId: input.purchaseOrderId ?? null,
      recurringExpenseId: input.recurringExpenseId ?? null,
      assetId: input.assetId ?? null,
      periodKey: input.periodKey ?? null,
      paymentMethod: input.paymentMethod ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      notes: input.notes ?? null,
    }),
  );
}

export interface ExpenseFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  source?: ExpenseSource;
}

export async function listExpenses(filters: ExpenseFilters): Promise<ExpenseEntryDTO[]> {
  const where: FindOptionsWhere<ExpenseEntry> = {};
  if (filters.from && filters.to) {
    where.incurredAt = Between(filters.from, filters.to) as unknown as string;
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.source) {
    where.source = filters.source;
  }
  const entries = await entryRepo().find({
    where,
    order: { incurredAt: "DESC", createdAt: "DESC" },
    take: 500,
  });
  return entries.map(toExpenseEntryDTO);
}

function emptyByKind(): Record<ExpenseCategoryKind, number> {
  return EXPENSE_CATEGORY_KINDS.reduce(
    (acc, kind) => ({ ...acc, [kind]: 0 }),
    {} as Record<ExpenseCategoryKind, number>,
  );
}

function emptyBySource(): Record<ExpenseSource, number> {
  return EXPENSE_SOURCES.reduce((acc, source) => ({ ...acc, [source]: 0 }), {} as Record<ExpenseSource, number>);
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const names = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${names[Number(month) - 1] ?? month}/${year.slice(2)}`;
}

/**
 * Visão de caixa: mostra tudo que saiu, inclusive investimento em ativo. Para a
 * visão de resultado, use o relatório de DRE, que troca o capex pela depreciação.
 */
export async function getExpenseSummary(from: string, to: string): Promise<ExpenseSummaryDTO> {
  const entries = await entryRepo().find({ where: { incurredAt: Between(from, to) as unknown as string } });

  const byKind = emptyByKind();
  const bySource = emptyBySource();
  const categoryMap = new Map<string, { name: string; kind: ExpenseCategoryKind; total: number }>();
  const monthMap = new Map<string, number>();
  let total = 0;

  for (const entry of entries) {
    const amount = Number(entry.amount);
    const kind = entry.category?.kind ?? "indirect_fixed";
    total += amount;
    byKind[kind] += amount;
    bySource[entry.source] += amount;

    const category = categoryMap.get(entry.categoryId) ?? {
      name: entry.category?.name ?? "",
      kind,
      total: 0,
    };
    category.total += amount;
    categoryMap.set(entry.categoryId, category);

    const monthKey = entry.incurredAt.slice(0, 7);
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + amount);
  }

  const byCategory: ExpenseByCategoryDTO[] = Array.from(categoryMap.entries())
    .map(([categoryId, value]) => ({
      categoryId,
      categoryName: value.name,
      kind: value.kind,
      total: value.total,
      sharePercent: total > 0 ? (value.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthTotal]) => ({ month, label: monthLabel(month), total: monthTotal }));

  return { from, to, total, byKind, bySource, byCategory, byMonth };
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function monthsBetween(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00Z`);
  const to = new Date(`${toDate}T00:00:00Z`);
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

/** Depreciação linear: (valor - residual) / vida útil em meses. */
export function monthlyDepreciationOf(asset: Asset): number {
  const life = asset.usefulLifeMonths > 0 ? asset.usefulLifeMonths : 1;
  const depreciable = Math.max(Number(asset.acquisitionCost) - Number(asset.salvageValue), 0);
  return depreciable / life;
}

/** Quantos meses do ativo já correram até a data, limitado à vida útil. */
export function elapsedDepreciationMonths(asset: Asset, referenceDate: string): number {
  const elapsed = monthsBetween(asset.acquiredAt, referenceDate);
  return Math.min(Math.max(elapsed, 0), asset.usefulLifeMonths);
}

export function normalizedMonthlyAmount(expense: RecurringExpense): number {
  const amount = Number(expense.amount);
  return expense.period === "yearly" ? amount / 12 : amount;
}

/**
 * Gera os lançamentos do mês para despesas fixas e depreciação. É idempotente:
 * os índices únicos por (origem, período) barram a segunda tentativa.
 */
export async function postMonth(month: string): Promise<{ recurring: number; depreciation: number }> {
  const { start, end } = monthBounds(month);

  const recurringExpenses = await recurringRepo().find({ where: { active: true } });
  let recurringPosted = 0;
  for (const expense of recurringExpenses) {
    if (expense.startDate > end) {
      continue;
    }
    if (expense.endDate && expense.endDate < start) {
      continue;
    }
    // Despesa anual só é lançada no mês de aniversário da data de início.
    if (expense.period === "yearly" && expense.startDate.slice(5, 7) !== month.slice(5, 7)) {
      continue;
    }
    const day = expense.dueDay ? Math.min(expense.dueDay, Number(end.slice(8))) : Number(end.slice(8));
    const incurredAt = `${month}-${String(day).padStart(2, "0")}`;
    const inserted = await entryRepo()
      .createQueryBuilder()
      .insert()
      .values({
        categoryId: expense.categoryId,
        description: expense.name,
        amount: Number(expense.amount),
        incurredAt,
        source: "recurring",
        supplierId: expense.supplierId ?? null,
        recurringExpenseId: expense.id,
        periodKey: month,
        paymentMethod: expense.paymentMethod ?? null,
      })
      .orIgnore()
      .execute();
    recurringPosted += inserted.identifiers.filter(Boolean).length;
  }

  const assets = await assetRepo().find({ where: { status: "active" } });
  let depreciationPosted = 0;
  for (const asset of assets) {
    if (asset.acquiredAt > end) {
      continue;
    }
    if (asset.disposedAt && asset.disposedAt < start) {
      continue;
    }
    // Passada a vida útil, não há mais o que depreciar.
    if (monthsBetween(asset.acquiredAt, start) >= asset.usefulLifeMonths) {
      continue;
    }
    const amount = monthlyDepreciationOf(asset);
    if (amount <= 0) {
      continue;
    }
    const inserted = await entryRepo()
      .createQueryBuilder()
      .insert()
      .values({
        categoryId: asset.categoryId,
        description: `Depreciação · ${asset.name}`,
        amount: Number(amount.toFixed(2)),
        incurredAt: end,
        source: "depreciation",
        assetId: asset.id,
        periodKey: month,
      })
      .orIgnore()
      .execute();
    depreciationPosted += inserted.identifiers.filter(Boolean).length;
  }

  return { recurring: recurringPosted, depreciation: depreciationPosted };
}
