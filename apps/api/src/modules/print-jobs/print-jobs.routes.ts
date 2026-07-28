import { Router } from "express";
import {
  printJobSchema,
  printJobStatusUpdateSchema,
  type PrintJobDTO,
  type PrintJobInput,
  type PrintJobStatus,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { PrintJob, Printer } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { applyFilamentMovement } from "../filaments/filament-stock.service";

export const printJobsRouter = Router();

const printJobRepo = () => AppDataSource.getRepository(PrintJob);
const printerRepo = () => AppDataSource.getRepository(Printer);

function toPrintJobDTO(job: PrintJob): PrintJobDTO {
  return {
    id: job.id,
    label: job.label,
    printerId: job.printerId ?? null,
    filamentId: job.filamentId ?? null,
    orderItemId: job.orderItemId ?? null,
    customQuoteId: job.customQuoteId ?? null,
    status: job.status,
    progressPercent: job.progressPercent ?? null,
    estimatedMinutes: job.estimatedMinutes ?? null,
    actualMinutes: job.actualMinutes ?? null,
    weightGramsUsed: job.weightGramsUsed ?? null,
    notes: job.notes ?? null,
    startedAt: job.startedAt ? job.startedAt.toISOString() : null,
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

printJobsRouter.use(requireAuth, requireRole("admin"));

printJobsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = req.query as { status?: PrintJobStatus };
    const where = status ? { status } : {};
    const jobs = await printJobRepo().find({ where, order: { createdAt: "DESC" } });
    res.json(jobs.map(toPrintJobDTO));
  }),
);

printJobsRouter.post(
  "/",
  validateBody(printJobSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PrintJobInput;
    const job = await printJobRepo().save(printJobRepo().create({ ...body }));
    res.status(201).json(toPrintJobDTO(job));
  }),
);

printJobsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const job = await printJobRepo().findOneBy({ id: req.params.id });
    if (!job) {
      throw new HttpError(404, "Print não encontrado.");
    }
    if (job.status !== "queued") {
      throw new HttpError(400, "Só é possível excluir prints que ainda estão na fila.");
    }
    await printJobRepo().remove(job);
    res.status(204).send();
  }),
);

printJobsRouter.patch(
  "/:id/status",
  validateBody(printJobStatusUpdateSchema),
  asyncHandler(async (req, res) => {
    const job = await printJobRepo().findOneBy({ id: req.params.id });
    if (!job) {
      throw new HttpError(404, "Print não encontrado.");
    }
    const { status, actualMinutes, weightGramsUsed } = req.body as {
      status: PrintJobStatus;
      actualMinutes?: number | null;
      weightGramsUsed?: number | null;
    };

    if (status === "printing") {
      if (job.status !== "queued") {
        throw new HttpError(400, "Só é possível iniciar prints que estão na fila.");
      }
      if (!job.printerId) {
        throw new HttpError(400, "Selecione uma impressora antes de iniciar.");
      }
      const printer = await printerRepo().findOneBy({ id: job.printerId });
      if (!printer) {
        throw new HttpError(404, "Impressora não encontrada.");
      }
      printer.status = "printing";
      await printerRepo().save(printer);
      job.status = "printing";
      job.startedAt = new Date();
    } else if (status === "done" || status === "failed") {
      if (job.status !== "printing") {
        throw new HttpError(400, "Só é possível concluir/marcar falha em prints que estão imprimindo.");
      }
      const finalWeight = weightGramsUsed ?? job.weightGramsUsed;
      if (job.filamentId && finalWeight) {
        await applyFilamentMovement(
          job.filamentId,
          -finalWeight,
          status === "done" ? "consumption" : "waste",
          "Print job",
        );
      }
      if (job.printerId) {
        const printer = await printerRepo().findOneBy({ id: job.printerId });
        if (printer) {
          printer.status = "idle";
          if (actualMinutes) {
            printer.totalPrintHours = Number(printer.totalPrintHours) + actualMinutes / 60;
          }
          await printerRepo().save(printer);
        }
      }
      job.status = status;
      job.finishedAt = new Date();
      job.actualMinutes = actualMinutes ?? job.actualMinutes;
      job.weightGramsUsed = finalWeight ?? job.weightGramsUsed;
    } else {
      job.status = status;
    }

    await printJobRepo().save(job);
    res.json(toPrintJobDTO(job));
  }),
);
