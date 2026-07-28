import { useState } from "react";
import type { PrinterDTO, PrintJobDTO, PrintJobStatus } from "@vortex/shared";
import { PRINT_JOB_STATUS_LABELS, PRINTER_STATUS_LABELS } from "@vortex/shared";
import {
  useCreatePrinter,
  useCreatePrinterMaintenance,
  useDeactivatePrinter,
  usePrinterMaintenance,
  usePrinters,
  useUpdatePrinter,
  useUpdatePrinterStatus,
} from "../../hooks/usePrinters";
import { useCreatePrintJob, useDeletePrintJob, usePrintJobs, useUpdatePrintJobStatus } from "../../hooks/usePrintJobs";
import { useFilaments } from "../../hooks/useFilaments";
import { useAdminOrders } from "../../hooks/useOrders";
import { useAdminQuotes } from "../../hooks/useQuotes";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const PRINTER_STATUS_BADGE: Record<PrinterDTO["status"], string> = {
  idle: "status-active",
  printing: "status-printing",
  maintenance: "status-pending",
  offline: "status-inactive",
};

const JOB_STATUS_BADGE: Record<PrintJobStatus, string> = {
  queued: "status-pending",
  printing: "status-printing",
  done: "status-delivered",
  failed: "status-cancelled",
};

interface PrinterFormState {
  name: string;
  model: string;
  wattage: string;
  purchaseCost: string;
  location: string;
  notes: string;
}

const EMPTY_PRINTER_FORM: PrinterFormState = {
  name: "",
  model: "",
  wattage: "150",
  purchaseCost: "",
  location: "",
  notes: "",
};

interface JobFormState {
  label: string;
  printerId: string;
  filamentId: string;
  orderItemId: string;
  customQuoteId: string;
  estimatedMinutes: string;
  weightGramsUsed: string;
  notes: string;
}

const EMPTY_JOB_FORM: JobFormState = {
  label: "",
  printerId: "",
  filamentId: "",
  orderItemId: "",
  customQuoteId: "",
  estimatedMinutes: "",
  weightGramsUsed: "",
  notes: "",
};

export function AdminProductionPage() {
  const [tab, setTab] = useState<"impressoras" | "fila">("impressoras");
  const { showToast } = useToast();

  // --- Printers ---
  const { data: printers = [], isLoading: loadingPrinters } = usePrinters();
  const createPrinter = useCreatePrinter();
  const updatePrinter = useUpdatePrinter();
  const updatePrinterStatus = useUpdatePrinterStatus();
  const deactivatePrinter = useDeactivatePrinter();
  const createMaintenance = useCreatePrinterMaintenance();

  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterDTO | null>(null);
  const [printerForm, setPrinterForm] = useState<PrinterFormState>(EMPTY_PRINTER_FORM);

  const [maintenancePrinter, setMaintenancePrinter] = useState<PrinterDTO | null>(null);
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const { data: maintenanceLogs = [] } = usePrinterMaintenance(maintenancePrinter?.id);

  function openCreatePrinter() {
    setEditingPrinter(null);
    setPrinterForm(EMPTY_PRINTER_FORM);
    setPrinterModalOpen(true);
  }

  function openEditPrinter(printer: PrinterDTO) {
    setEditingPrinter(printer);
    setPrinterForm({
      name: printer.name,
      model: printer.model ?? "",
      wattage: String(printer.wattage),
      purchaseCost: printer.purchaseCost ? String(printer.purchaseCost) : "",
      location: printer.location ?? "",
      notes: printer.notes ?? "",
    });
    setPrinterModalOpen(true);
  }

  function handleSavePrinter() {
    const wattage = parseInt(printerForm.wattage, 10);
    if (!printerForm.name || !wattage) {
      showToast("Preencha nome e potência.", "error");
      return;
    }
    const input = {
      name: printerForm.name,
      model: printerForm.model || null,
      wattage,
      purchaseCost: printerForm.purchaseCost ? parseFloat(printerForm.purchaseCost) : null,
      location: printerForm.location || null,
      notes: printerForm.notes || null,
      active: true,
    };
    const mutation = editingPrinter
      ? updatePrinter.mutateAsync({ id: editingPrinter.id, input })
      : createPrinter.mutateAsync(input);
    mutation
      .then(() => {
        setPrinterModalOpen(false);
        showToast(`Impressora ${editingPrinter ? "atualizada" : "cadastrada"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar a impressora.", "error"));
  }

  function handleSetPrinterStatus(printer: PrinterDTO, status: "idle" | "maintenance" | "offline") {
    updatePrinterStatus.mutate(
      { id: printer.id, input: { status } },
      { onError: () => showToast("Não foi possível alterar o status.", "error") },
    );
  }

  function handleDeactivatePrinter(id: string) {
    deactivatePrinter.mutate(id, {
      onSuccess: () => showToast("Impressora desativada.", "info"),
      onError: () => showToast("Não foi possível desativar a impressora.", "error"),
    });
  }

  function handleSaveMaintenance() {
    if (!maintenancePrinter || !maintenanceDescription) {
      showToast("Descreva a manutenção realizada.", "error");
      return;
    }
    createMaintenance
      .mutateAsync({
        printerId: maintenancePrinter.id,
        input: { description: maintenanceDescription, cost: maintenanceCost ? parseFloat(maintenanceCost) : null },
      })
      .then(() => {
        showToast("Manutenção registrada!", "success");
        setMaintenanceDescription("");
        setMaintenanceCost("");
      })
      .catch(() => showToast("Não foi possível registrar a manutenção.", "error"));
  }

  // --- Print Jobs ---
  const { data: jobs = [], isLoading: loadingJobs } = usePrintJobs();
  const { data: filaments = [] } = useFilaments();
  const { data: orders = [] } = useAdminOrders("all");
  const { data: quotes = [] } = useAdminQuotes();
  const createJob = useCreatePrintJob();
  const updateJobStatus = useUpdatePrintJobStatus();
  const deleteJob = useDeletePrintJob();

  const orderItemOptions = orders
    .filter((o) => o.status === "pending" || o.status === "printing")
    .flatMap((o) => o.items.map((item) => ({ id: item.id, label: `${o.orderNumber} · ${item.name} x${item.qty}` })));
  const quoteOptions = quotes
    .filter((q) => q.status === "quoted")
    .map((q) => ({ id: q.id, label: `Orçamento · ${q.material}/${q.color} x${q.qty}` }));

  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState<JobFormState>(EMPTY_JOB_FORM);

  const [completingJob, setCompletingJob] = useState<{ job: PrintJobDTO; status: "done" | "failed" } | null>(null);
  const [completeMinutes, setCompleteMinutes] = useState("");
  const [completeGrams, setCompleteGrams] = useState("");

  function openCreateJob() {
    setJobForm(EMPTY_JOB_FORM);
    setJobModalOpen(true);
  }

  function handleSaveJob() {
    if (!jobForm.label) {
      showToast("Informe um nome/label para o print.", "error");
      return;
    }
    createJob
      .mutateAsync({
        label: jobForm.label,
        printerId: jobForm.printerId || null,
        filamentId: jobForm.filamentId || null,
        orderItemId: jobForm.orderItemId || null,
        customQuoteId: jobForm.customQuoteId || null,
        estimatedMinutes: jobForm.estimatedMinutes ? parseInt(jobForm.estimatedMinutes, 10) : null,
        weightGramsUsed: jobForm.weightGramsUsed ? parseInt(jobForm.weightGramsUsed, 10) : null,
        notes: null,
      })
      .then(() => {
        setJobModalOpen(false);
        showToast("Print adicionado à fila!", "success");
      })
      .catch(() => showToast("Não foi possível criar o print.", "error"));
  }

  function handleStart(job: PrintJobDTO) {
    if (!job.printerId) {
      showToast("Selecione uma impressora antes de iniciar (edite o print).", "error");
      return;
    }
    updateJobStatus.mutate(
      { id: job.id, input: { status: "printing" } },
      {
        onSuccess: () => showToast("Impressão iniciada!", "success"),
        onError: (err: any) =>
          showToast(err?.response?.data?.message ?? "Não foi possível iniciar a impressão.", "error"),
      },
    );
  }

  function openComplete(job: PrintJobDTO, status: "done" | "failed") {
    setCompletingJob({ job, status });
    setCompleteMinutes(job.estimatedMinutes ? String(job.estimatedMinutes) : "");
    setCompleteGrams(job.weightGramsUsed ? String(job.weightGramsUsed) : "");
  }

  function handleConfirmComplete() {
    if (!completingJob) return;
    updateJobStatus.mutate(
      {
        id: completingJob.job.id,
        input: {
          status: completingJob.status,
          actualMinutes: completeMinutes ? parseInt(completeMinutes, 10) : null,
          weightGramsUsed: completeGrams ? parseInt(completeGrams, 10) : null,
        },
      },
      {
        onSuccess: () => {
          setCompletingJob(null);
          showToast(completingJob.status === "done" ? "Print concluído!" : "Print marcado como falha.", "info");
        },
        onError: (err: any) =>
          showToast(err?.response?.data?.message ?? "Não foi possível atualizar o print.", "error"),
      },
    );
  }

  function handleDeleteJob(id: string) {
    deleteJob.mutate(id, {
      onSuccess: () => showToast("Print removido.", "info"),
      onError: () => showToast("Só é possível excluir prints na fila.", "error"),
    });
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Produção</h1>
        {tab === "impressoras" ? (
          <button className="btn-primary" onClick={openCreatePrinter}>
            + Nova Impressora
          </button>
        ) : (
          <button className="btn-primary" onClick={openCreateJob}>
            + Novo Print
          </button>
        )}
      </div>

      <div className="tabs">
        <button className={`tab-btn${tab === "impressoras" ? " active" : ""}`} onClick={() => setTab("impressoras")}>
          Impressoras
        </button>
        <button className={`tab-btn${tab === "fila" ? " active" : ""}`} onClick={() => setTab("fila")}>
          Fila de Impressão
        </button>
      </div>

      {tab === "impressoras" ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Impressora</th>
                <th>Status</th>
                <th>Horas totais</th>
                <th>Potência</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingPrinters ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--text-muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                printers.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.name}
                      {p.model && <div style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>{p.model}</div>}
                    </td>
                    <td>
                      <span className={`status-badge ${PRINTER_STATUS_BADGE[p.status]}`}>
                        {PRINTER_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td style={{ fontSize: ".82rem" }}>{p.totalPrintHours.toFixed(1)}h</td>
                    <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{p.wattage}W</td>
                    <td>
                      {p.status !== "idle" && (
                        <button className="action-btn" onClick={() => handleSetPrinterStatus(p, "idle")}>
                          ✅ Ociosa
                        </button>
                      )}
                      {p.status !== "maintenance" && (
                        <button className="action-btn" onClick={() => handleSetPrinterStatus(p, "maintenance")}>
                          🛠 Manutenção
                        </button>
                      )}
                      {p.status !== "offline" && (
                        <button className="action-btn" onClick={() => handleSetPrinterStatus(p, "offline")}>
                          🔌 Offline
                        </button>
                      )}
                      <button className="action-btn" onClick={() => setMaintenancePrinter(p)}>
                        📋 Histórico
                      </button>
                      <button className="action-btn" onClick={() => openEditPrinter(p)}>
                        ✏️ Editar
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeactivatePrinter(p.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Print</th>
                <th>Impressora</th>
                <th>Filamento</th>
                <th>Status</th>
                <th>Min (est/real)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loadingJobs ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const printer = printers.find((p) => p.id === job.printerId);
                  const filament = filaments.find((f) => f.id === job.filamentId);
                  return (
                    <tr key={job.id}>
                      <td style={{ fontSize: ".85rem" }}>{job.label}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>{printer?.name ?? "—"}</td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                        {filament ? `${filament.brand} · ${filament.color}` : "—"}
                      </td>
                      <td>
                        <span className={`status-badge ${JOB_STATUS_BADGE[job.status]}`}>
                          {PRINT_JOB_STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                        {job.estimatedMinutes ?? "—"} / {job.actualMinutes ?? "—"}
                      </td>
                      <td>
                        {job.status === "queued" && (
                          <>
                            <button className="action-btn" onClick={() => handleStart(job)}>
                              ▶ Iniciar
                            </button>
                            <button className="action-btn danger" onClick={() => handleDeleteJob(job.id)}>
                              🗑
                            </button>
                          </>
                        )}
                        {job.status === "printing" && (
                          <>
                            <button className="action-btn" onClick={() => openComplete(job, "done")}>
                              ✅ Concluir
                            </button>
                            <button className="action-btn danger" onClick={() => openComplete(job, "failed")}>
                              ✖ Falhou
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Printer create/edit modal --- */}
      <Modal
        open={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
        title={`${editingPrinter ? "Editar" : "Nova"} Impressora`}
      >
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Nome</label>
            <input
              className="admin-input"
              value={printerForm.name}
              onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Modelo</label>
            <input
              className="admin-input"
              value={printerForm.model}
              onChange={(e) => setPrinterForm({ ...printerForm, model: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Potência (W)</label>
            <input
              className="admin-input"
              type="number"
              value={printerForm.wattage}
              onChange={(e) => setPrinterForm({ ...printerForm, wattage: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Custo de compra (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={printerForm.purchaseCost}
              onChange={(e) => setPrinterForm({ ...printerForm, purchaseCost: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>Localização</label>
            <input
              className="admin-input"
              value={printerForm.location}
              onChange={(e) => setPrinterForm({ ...printerForm, location: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Observações</label>
          <textarea
            className="admin-textarea"
            value={printerForm.notes}
            onChange={(e) => setPrinterForm({ ...printerForm, notes: e.target.value })}
          />
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSavePrinter}>
          💾 Salvar Impressora
        </button>
      </Modal>

      {/* --- Printer maintenance modal --- */}
      <Modal
        open={!!maintenancePrinter}
        onClose={() => setMaintenancePrinter(null)}
        title={`Manutenção · ${maintenancePrinter?.name ?? ""}`}
      >
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Descrição</label>
            <input
              className="admin-input"
              value={maintenanceDescription}
              onChange={(e) => setMaintenanceDescription(e.target.value)}
              placeholder="Ex: Troca do bico"
            />
          </div>
          <div className="form-group">
            <label>Custo (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={maintenanceCost}
              onChange={(e) => setMaintenanceCost(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: ".6rem" }} onClick={handleSaveMaintenance}>
          Registrar
        </button>

        {maintenanceLogs.length > 0 && (
          <div style={{ marginTop: "1.2rem" }}>
            <h3 style={{ fontSize: ".9rem", marginBottom: ".5rem" }}>Histórico</h3>
            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
              {maintenanceLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: ".82rem",
                    padding: ".4rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span>{log.description}</span>
                  <span style={{ color: "var(--text-muted)" }}>{log.cost ? `R$ ${log.cost.toFixed(2)}` : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* --- Job create modal --- */}
      <Modal open={jobModalOpen} onClose={() => setJobModalOpen(false)} title="Novo Print">
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Label</label>
            <input
              className="admin-input"
              value={jobForm.label}
              onChange={(e) => setJobForm({ ...jobForm, label: e.target.value })}
              placeholder="Ex: Dragão Articulado x2"
            />
          </div>
          <div className="form-group">
            <label>Impressora</label>
            <select
              className="admin-select"
              value={jobForm.printerId}
              onChange={(e) => setJobForm({ ...jobForm, printerId: e.target.value })}
            >
              <option value="">Definir depois</option>
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Filamento</label>
            <select
              className="admin-select"
              value={jobForm.filamentId}
              onChange={(e) => setJobForm({ ...jobForm, filamentId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} · {f.color}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Item de pedido</label>
            <select
              className="admin-select"
              value={jobForm.orderItemId}
              onChange={(e) => setJobForm({ ...jobForm, orderItemId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {orderItemOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Orçamento personalizado</label>
            <select
              className="admin-select"
              value={jobForm.customQuoteId}
              onChange={(e) => setJobForm({ ...jobForm, customQuoteId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {quoteOptions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Tempo estimado (min)</label>
            <input
              className="admin-input"
              type="number"
              value={jobForm.estimatedMinutes}
              onChange={(e) => setJobForm({ ...jobForm, estimatedMinutes: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>Peso estimado (g)</label>
            <input
              className="admin-input"
              type="number"
              value={jobForm.weightGramsUsed}
              onChange={(e) => setJobForm({ ...jobForm, weightGramsUsed: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSaveJob}>
          💾 Adicionar à fila
        </button>
      </Modal>

      {/* --- Complete/fail job modal --- */}
      <Modal
        open={!!completingJob}
        onClose={() => setCompletingJob(null)}
        title={completingJob?.status === "done" ? "Concluir print" : "Marcar falha"}
      >
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Tempo real (min)</label>
            <input
              className="admin-input"
              type="number"
              value={completeMinutes}
              onChange={(e) => setCompleteMinutes(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Peso usado (g)</label>
            <input
              className="admin-input"
              type="number"
              value={completeGrams}
              onChange={(e) => setCompleteGrams(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary" style={{ width: "100%", marginTop: ".6rem" }} onClick={handleConfirmComplete}>
          Confirmar
        </button>
      </Modal>
    </div>
  );
}
