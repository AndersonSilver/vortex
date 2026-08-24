import { useState } from "react";
import {
  EXPENSE_CATEGORY_KIND_LABELS,
  EXPENSE_CATEGORY_KINDS,
  EXPENSE_CATEGORY_TARGET_LABELS,
  EXPENSE_CATEGORY_TARGETS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_SOURCE_LABELS,
  RECURRENCE_PERIOD_LABELS,
  RECURRENCE_PERIODS,
  type ExpenseCategoryDTO,
  type ExpenseCategoryKind,
  type ExpenseCategoryTarget,
  type ExpensePaymentMethod,
  type RecurrencePeriod,
  type RecurringExpenseDTO,
} from "@vortex/shared";
import {
  useApplyCostRates,
  useCostRates,
  useCreateExpense,
  useDeleteExpense,
  useExpenseSummary,
  useExpenses,
  usePostMonth,
} from "../../hooks/useExpenses";
import {
  useCreateExpenseCategory,
  useDeleteExpenseCategory,
  useExpenseCategories,
  useUpdateExpenseCategory,
} from "../../hooks/useExpenseCategories";
import {
  useCreateRecurringExpense,
  useDeleteRecurringExpense,
  useRecurringExpenses,
  useUpdateRecurringExpense,
} from "../../hooks/useRecurringExpenses";
import { useSuppliers } from "../../hooks/useSuppliers";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

type Tab = "entries" | "recurring" | "categories" | "rates";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "entries", label: "Lançamentos" },
  { key: "recurring", label: "Despesas fixas" },
  { key: "categories", label: "Categorias" },
  { key: "rates", label: "Taxas de custo" },
];

function money(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function firstDayMonthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function AdminExpensesPage() {
  const [tab, setTab] = useState<Tab>("entries");
  const [from, setFrom] = useState(firstDayMonthsAgo(5));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: entries = [], isLoading } = useExpenses({ from, to });
  const { data: summary } = useExpenseSummary(from, to);
  const { data: categories = [] } = useExpenseCategories(true);
  const { data: recurring = [] } = useRecurringExpenses(true);
  const { data: rates } = useCostRates();
  const { data: suppliers = [] } = useSuppliers();

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const postMonth = usePostMonth();
  const applyRates = useApplyCostRates();
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();
  const createRecurring = useCreateRecurringExpense();
  const updateRecurring = useUpdateRecurringExpense();
  const deleteRecurring = useDeleteRecurringExpense();
  const { showToast } = useToast();

  const [month, setMonth] = useState(currentMonth());

  const [entryModal, setEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    incurredAt: new Date().toISOString().slice(0, 10),
    supplierId: "",
    paymentMethod: "" as ExpensePaymentMethod | "",
    notes: "",
  });

  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategoryDTO | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    kind: "indirect_fixed" as ExpenseCategoryKind,
    target: "none" as ExpenseCategoryTarget,
    emoji: "💸",
    active: true,
  });

  const [recurringModal, setRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpenseDTO | null>(null);
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    categoryId: "",
    amount: "",
    period: "monthly" as RecurrencePeriod,
    dueDay: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    supplierId: "",
    paymentMethod: "" as ExpensePaymentMethod | "",
    notes: "",
  });

  function handleCreateEntry() {
    if (!entryForm.categoryId || !entryForm.description.trim() || !entryForm.amount) {
      showToast("Informe categoria, descrição e valor.", "error");
      return;
    }
    createExpense
      .mutateAsync({
        categoryId: entryForm.categoryId,
        description: entryForm.description.trim(),
        amount: parseFloat(entryForm.amount) || 0,
        incurredAt: entryForm.incurredAt,
        supplierId: entryForm.supplierId || null,
        paymentMethod: entryForm.paymentMethod || null,
        notes: entryForm.notes.trim() || null,
      })
      .then(() => {
        setEntryModal(false);
        setEntryForm({ ...entryForm, description: "", amount: "", notes: "" });
        showToast("Lançamento registrado!", "success");
      })
      .catch(() => showToast("Não foi possível registrar o lançamento.", "error"));
  }

  function handlePostMonth() {
    postMonth.mutate(month, {
      onSuccess: (result) =>
        showToast(
          `Mês fechado: ${result.recurring} despesa(s) fixa(s) e ${result.depreciation} depreciação(ões) lançadas.`,
          "success",
        ),
      onError: (err: any) => showToast(err?.response?.data?.message ?? "Não foi possível fechar o mês.", "error"),
    });
  }

  function openCategoryModal(category: ExpenseCategoryDTO | null) {
    setEditingCategory(category);
    setCategoryForm(
      category
        ? {
            name: category.name,
            kind: category.kind,
            target: category.target,
            emoji: category.emoji,
            active: category.active,
          }
        : { name: "", kind: "indirect_fixed", target: "none", emoji: "💸", active: true },
    );
    setCategoryModal(true);
  }

  function handleSaveCategory() {
    if (!categoryForm.name.trim()) {
      showToast("Informe o nome da categoria.", "error");
      return;
    }
    const payload = { ...categoryForm, name: categoryForm.name.trim() };
    const action = editingCategory
      ? updateCategory.mutateAsync({ id: editingCategory.id, input: payload })
      : createCategory.mutateAsync(payload);
    action
      .then(() => {
        setCategoryModal(false);
        showToast("Categoria salva!", "success");
      })
      .catch(() => showToast("Não foi possível salvar a categoria.", "error"));
  }

  function openRecurringModal(expense: RecurringExpenseDTO | null) {
    setEditingRecurring(expense);
    setRecurringForm(
      expense
        ? {
            name: expense.name,
            categoryId: expense.categoryId,
            amount: String(expense.amount),
            period: expense.period,
            dueDay: expense.dueDay ? String(expense.dueDay) : "",
            startDate: expense.startDate,
            endDate: expense.endDate ?? "",
            supplierId: expense.supplierId ?? "",
            paymentMethod: expense.paymentMethod ?? "",
            notes: expense.notes ?? "",
          }
        : {
            name: "",
            categoryId: "",
            amount: "",
            period: "monthly",
            dueDay: "",
            startDate: new Date().toISOString().slice(0, 10),
            endDate: "",
            supplierId: "",
            paymentMethod: "",
            notes: "",
          },
    );
    setRecurringModal(true);
  }

  function handleSaveRecurring() {
    if (!recurringForm.name.trim() || !recurringForm.categoryId || !recurringForm.amount) {
      showToast("Informe nome, categoria e valor.", "error");
      return;
    }
    const payload = {
      name: recurringForm.name.trim(),
      categoryId: recurringForm.categoryId,
      amount: parseFloat(recurringForm.amount) || 0,
      period: recurringForm.period,
      dueDay: recurringForm.dueDay ? parseInt(recurringForm.dueDay, 10) : null,
      startDate: recurringForm.startDate,
      endDate: recurringForm.endDate || null,
      supplierId: recurringForm.supplierId || null,
      paymentMethod: recurringForm.paymentMethod || null,
      notes: recurringForm.notes.trim() || null,
      active: true,
    };
    const action = editingRecurring
      ? updateRecurring.mutateAsync({ id: editingRecurring.id, input: payload })
      : createRecurring.mutateAsync(payload);
    action
      .then(() => {
        setRecurringModal(false);
        showToast("Despesa fixa salva!", "success");
      })
      .catch(() => showToast("Não foi possível salvar a despesa fixa.", "error"));
  }

  const monthlyFixedTotal = recurring
    .filter((expense) => expense.active)
    .reduce((sum, expense) => sum + expense.monthlyAmount, 0);

  return (
    <div>
      <div className="admin-header">
        <h1>Despesas</h1>
        {tab === "entries" && (
          <button className="btn-primary" onClick={() => setEntryModal(true)}>
            + Novo lançamento
          </button>
        )}
        {tab === "recurring" && (
          <button className="btn-primary" onClick={() => openRecurringModal(null)}>
            + Nova despesa fixa
          </button>
        )}
        {tab === "categories" && (
          <button className="btn-primary" onClick={() => openCategoryModal(null)}>
            + Nova categoria
          </button>
        )}
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab-btn${tab === item.key ? " active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "entries" && (
        <>
          <div
            className="admin-form"
            style={{ display: "flex", gap: "1rem", alignItems: "flex-end", margin: "1rem 0" }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label>De</label>
              <input className="admin-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Até</label>
              <input className="admin-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Fechar mês</label>
              <input className="admin-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <button className="action-btn" onClick={handlePostMonth} disabled={postMonth.isPending}>
              📅 Lançar fixas e depreciação
            </button>
          </div>

          {summary && (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div className="admin-form" style={{ padding: ".8rem 1rem" }}>
                <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>Total no período</div>
                <strong>{money(summary.total)}</strong>
              </div>
              {EXPENSE_CATEGORY_KINDS.map((kind) => (
                <div key={kind} className="admin-form" style={{ padding: ".8rem 1rem" }}>
                  <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
                    {EXPENSE_CATEGORY_KIND_LABELS[kind]}
                  </div>
                  <strong>{money(summary.byKind[kind] ?? 0)}</strong>
                </div>
              ))}
            </div>
          )}

          {summary && summary.byCategory.length > 0 && (
            <div className="admin-table-wrap" style={{ marginBottom: "1.5rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Comportamento</th>
                    <th>Total</th>
                    <th>Fatia</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byCategory.map((row) => (
                    <tr key={row.categoryId}>
                      <td>{row.categoryName}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                        {EXPENSE_CATEGORY_KIND_LABELS[row.kind]}
                      </td>
                      <td>{money(row.total)}</td>
                      <td>{row.sharePercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                      Carregando...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                      Nenhum lançamento no período.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ fontSize: ".82rem" }}>
                        {new Date(`${entry.incurredAt}T00:00:00`).toLocaleDateString("pt-BR")}
                      </td>
                      <td>{entry.description}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{entry.categoryName}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                        {EXPENSE_SOURCE_LABELS[entry.source]}
                      </td>
                      <td>
                        <strong>{money(entry.amount)}</strong>
                      </td>
                      <td>
                        {entry.source === "manual" && (
                          <button
                            className="action-btn danger"
                            onClick={() =>
                              deleteExpense.mutate(entry.id, {
                                onSuccess: () => showToast("Lançamento removido.", "info"),
                              })
                            }
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "recurring" && (
        <>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem", margin: "1rem 0" }}>
            Custo fixo mensal somado: <strong>{money(monthlyFixedTotal)}</strong>. Use "Lançar fixas e depreciação"
            na aba Lançamentos para gerar o mês.
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Despesa</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Período</th>
                  <th>Equivalente/mês</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recurring.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                      Nenhuma despesa fixa cadastrada.
                    </td>
                  </tr>
                ) : (
                  recurring.map((expense) => (
                    <tr key={expense.id} style={{ opacity: expense.active ? 1 : 0.5 }}>
                      <td>{expense.name}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{expense.categoryName}</td>
                      <td>{money(expense.amount)}</td>
                      <td style={{ fontSize: ".82rem" }}>{RECURRENCE_PERIOD_LABELS[expense.period]}</td>
                      <td>{money(expense.monthlyAmount)}</td>
                      <td>
                        <button className="action-btn" onClick={() => openRecurringModal(expense)}>
                          ✏️
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() =>
                            deleteRecurring.mutate(expense.id, {
                              onSuccess: () => showToast("Despesa fixa desativada.", "info"),
                            })
                          }
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "categories" && (
        <div className="admin-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Comportamento</th>
                <th>Movimenta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} style={{ opacity: category.active ? 1 : 0.5 }}>
                  <td>
                    {category.emoji} {category.name}
                    {category.system && (
                      <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}> · padrão</span>
                    )}
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                    {EXPENSE_CATEGORY_KIND_LABELS[category.kind]}
                  </td>
                  <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                    {EXPENSE_CATEGORY_TARGET_LABELS[category.target]}
                  </td>
                  <td>
                    <button className="action-btn" onClick={() => openCategoryModal(category)}>
                      ✏️
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() =>
                        deleteCategory.mutate(category.id, {
                          onSuccess: () => showToast("Categoria desativada.", "info"),
                        })
                      }
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rates" && rates && (
        <div className="admin-form" style={{ marginTop: "1rem", padding: "1rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: ".6rem" }}>Taxas derivadas dos gastos reais</h3>
          <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>
            Calculado com {rates.assetsCount} ativo(s) e {rates.recurringCount} despesa(s) fixa(s).
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem", marginTop: ".8rem" }}>
            <div>Depreciação mensal</div>
            <strong>{money(rates.monthlyDepreciation)}</strong>
            <div>Custo fixo mensal</div>
            <strong>{money(rates.monthlyFixedExpenses)}</strong>
            <div>Manutenção média/mês</div>
            <strong>{money(rates.monthlyMaintenance)}</strong>
            <div>Horas de impressora/mês</div>
            <strong>{rates.printerHoursPerMonth}h</strong>
            <div>Horas produtivas/mês</div>
            <strong>{rates.productiveHoursPerMonth}h</strong>
          </div>
          <hr style={{ margin: "1rem 0", borderColor: "var(--border)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: ".6rem" }}>
            <div />
            <strong style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Configurado</strong>
            <strong style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Sugerido</strong>
            <div>Custo de máquina/hora</div>
            <span>{money(rates.configuredMachineCostPerHour)}</span>
            <strong>{money(rates.suggestedMachineCostPerHour)}</strong>
            <div>Custo fixo/hora (overhead)</div>
            <span>{money(rates.configuredOverheadCostPerHour)}</span>
            <strong>{money(rates.suggestedOverheadCostPerHour)}</strong>
          </div>
          <button
            className="btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={() =>
              applyRates.mutate(undefined, {
                onSuccess: () => showToast("Taxas aplicadas nas configurações.", "success"),
                onError: () => showToast("Não foi possível aplicar as taxas.", "error"),
              })
            }
          >
            ✔ Aplicar taxas sugeridas
          </button>
        </div>
      )}

      <Modal open={entryModal} onClose={() => setEntryModal(false)} title="Novo lançamento">
        <div className="form-group">
          <label>Descrição</label>
          <input
            className="admin-input"
            value={entryForm.description}
            onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
          <div className="form-group">
            <label>Categoria</label>
            <select
              className="admin-select"
              value={entryForm.categoryId}
              onChange={(e) => setEntryForm({ ...entryForm, categoryId: e.target.value })}
            >
              <option value="">Selecione</option>
              {categories
                .filter((category) => category.active)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label>Valor</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={entryForm.amount}
              onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Data</label>
            <input
              className="admin-input"
              type="date"
              value={entryForm.incurredAt}
              onChange={(e) => setEntryForm({ ...entryForm, incurredAt: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Forma de pagamento</label>
            <select
              className="admin-select"
              value={entryForm.paymentMethod}
              onChange={(e) =>
                setEntryForm({ ...entryForm, paymentMethod: e.target.value as ExpensePaymentMethod | "" })
              }
            >
              <option value="">Não informada</option>
              {EXPENSE_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {EXPENSE_PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Fornecedor</label>
            <select
              className="admin-select"
              value={entryForm.supplierId}
              onChange={(e) => setEntryForm({ ...entryForm, supplierId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea
            className="admin-textarea"
            value={entryForm.notes}
            onChange={(e) => setEntryForm({ ...entryForm, notes: e.target.value })}
          />
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleCreateEntry}>
          💾 Lançar
        </button>
      </Modal>

      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title={editingCategory ? "Editar categoria" : "Nova categoria"}
      >
        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: ".8rem" }}>
          <div className="form-group">
            <label>Nome</label>
            <input
              className="admin-input"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Emoji</label>
            <input
              className="admin-input"
              value={categoryForm.emoji}
              onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Comportamento do custo</label>
          <select
            className="admin-select"
            value={categoryForm.kind}
            disabled={editingCategory?.system}
            onChange={(e) => setCategoryForm({ ...categoryForm, kind: e.target.value as ExpenseCategoryKind })}
          >
            {EXPENSE_CATEGORY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EXPENSE_CATEGORY_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>O que movimenta ao receber a compra</label>
          <select
            className="admin-select"
            value={categoryForm.target}
            disabled={editingCategory?.system}
            onChange={(e) => setCategoryForm({ ...categoryForm, target: e.target.value as ExpenseCategoryTarget })}
          >
            {EXPENSE_CATEGORY_TARGETS.map((target) => (
              <option key={target} value={target}>
                {EXPENSE_CATEGORY_TARGET_LABELS[target]}
              </option>
            ))}
          </select>
        </div>
        {editingCategory?.system && (
          <p style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>
            Categoria padrão: nome e emoji podem mudar, mas o comportamento e o destino ficam fixos porque o
            histórico e o rateio de preço dependem deles.
          </p>
        )}
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleSaveCategory}>
          💾 Salvar
        </button>
      </Modal>

      <Modal
        open={recurringModal}
        onClose={() => setRecurringModal(false)}
        title={editingRecurring ? "Editar despesa fixa" : "Nova despesa fixa"}
      >
        <div className="form-group">
          <label>Nome</label>
          <input
            className="admin-input"
            value={recurringForm.name}
            onChange={(e) => setRecurringForm({ ...recurringForm, name: e.target.value })}
            placeholder="Aluguel, internet, contador..."
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
          <div className="form-group">
            <label>Categoria</label>
            <select
              className="admin-select"
              value={recurringForm.categoryId}
              onChange={(e) => setRecurringForm({ ...recurringForm, categoryId: e.target.value })}
            >
              <option value="">Selecione</option>
              {categories
                .filter((category) => category.active && category.kind === "indirect_fixed")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.emoji} {category.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-group">
            <label>Valor</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={recurringForm.amount}
              onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Período</label>
            <select
              className="admin-select"
              value={recurringForm.period}
              onChange={(e) => setRecurringForm({ ...recurringForm, period: e.target.value as RecurrencePeriod })}
            >
              {RECURRENCE_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {RECURRENCE_PERIOD_LABELS[period]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Dia de vencimento</label>
            <input
              className="admin-input"
              type="number"
              min="1"
              max="31"
              value={recurringForm.dueDay}
              onChange={(e) => setRecurringForm({ ...recurringForm, dueDay: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Início</label>
            <input
              className="admin-input"
              type="date"
              value={recurringForm.startDate}
              onChange={(e) => setRecurringForm({ ...recurringForm, startDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Fim (opcional)</label>
            <input
              className="admin-input"
              type="date"
              value={recurringForm.endDate}
              onChange={(e) => setRecurringForm({ ...recurringForm, endDate: e.target.value })}
            />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%" }} onClick={handleSaveRecurring}>
          💾 Salvar
        </button>
      </Modal>
    </div>
  );
}
