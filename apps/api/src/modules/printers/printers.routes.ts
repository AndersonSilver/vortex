import { Router } from "express";
import {
  printerMaintenanceLogSchema,
  printerSchema,
  printerStatusSchema,
  type PrinterDTO,
  type PrinterInput,
  type PrinterMaintenanceLogDTO,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Printer, PrinterMaintenanceLog } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const printersRouter = Router();

const printerRepo = () => AppDataSource.getRepository(Printer);
const maintenanceRepo = () => AppDataSource.getRepository(PrinterMaintenanceLog);

function toPrinterDTO(printer: Printer): PrinterDTO {
  return {
    id: printer.id,
    name: printer.name,
    model: printer.model ?? null,
    status: printer.status,
    wattage: printer.wattage,
    totalPrintHours: Number(printer.totalPrintHours),
    purchaseCost: printer.purchaseCost !== null && printer.purchaseCost !== undefined ? Number(printer.purchaseCost) : null,
    location: printer.location ?? null,
    notes: printer.notes ?? null,
    active: printer.active,
    createdAt: printer.createdAt.toISOString(),
    updatedAt: printer.updatedAt.toISOString(),
  };
}

function toMaintenanceLogDTO(log: PrinterMaintenanceLog): PrinterMaintenanceLogDTO {
  return {
    id: log.id,
    printerId: log.printerId,
    description: log.description,
    cost: log.cost !== null && log.cost !== undefined ? Number(log.cost) : null,
    hoursAtMaintenance:
      log.hoursAtMaintenance !== null && log.hoursAtMaintenance !== undefined ? Number(log.hoursAtMaintenance) : null,
    createdAt: log.createdAt.toISOString(),
  };
}

printersRouter.use(requireAuth, requireRole("admin"));

printersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const printers = await printerRepo().find({ where, order: { createdAt: "DESC" } });
    res.json(printers.map(toPrinterDTO));
  }),
);

printersRouter.post(
  "/",
  validateBody(printerSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as PrinterInput;
    const printer = await printerRepo().save(printerRepo().create({ ...body }));
    res.status(201).json(toPrinterDTO(printer));
  }),
);

printersRouter.put(
  "/:id",
  validateBody(printerSchema),
  asyncHandler(async (req, res) => {
    const printer = await printerRepo().findOneBy({ id: req.params.id });
    if (!printer) {
      throw new HttpError(404, "Impressora não encontrada.");
    }
    Object.assign(printer, req.body);
    await printerRepo().save(printer);
    res.json(toPrinterDTO(printer));
  }),
);

printersRouter.patch(
  "/:id/status",
  validateBody(printerStatusSchema),
  asyncHandler(async (req, res) => {
    const printer = await printerRepo().findOneBy({ id: req.params.id });
    if (!printer) {
      throw new HttpError(404, "Impressora não encontrada.");
    }
    const { status } = req.body as { status: "idle" | "maintenance" | "offline" };
    printer.status = status;
    await printerRepo().save(printer);
    res.json(toPrinterDTO(printer));
  }),
);

printersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const printer = await printerRepo().findOneBy({ id: req.params.id });
    if (!printer) {
      throw new HttpError(404, "Impressora não encontrada.");
    }
    printer.active = false;
    await printerRepo().save(printer);
    res.status(204).send();
  }),
);

printersRouter.get(
  "/:id/maintenance",
  asyncHandler(async (req, res) => {
    const logs = await maintenanceRepo().find({
      where: { printerId: req.params.id },
      order: { createdAt: "DESC" },
    });
    res.json(logs.map(toMaintenanceLogDTO));
  }),
);

printersRouter.post(
  "/:id/maintenance",
  validateBody(printerMaintenanceLogSchema),
  asyncHandler(async (req, res) => {
    const printer = await printerRepo().findOneBy({ id: req.params.id });
    if (!printer) {
      throw new HttpError(404, "Impressora não encontrada.");
    }
    const { description, cost, hoursAtMaintenance } = req.body as {
      description: string;
      cost?: number | null;
      hoursAtMaintenance?: number | null;
    };
    const log = await maintenanceRepo().save(
      maintenanceRepo().create({
        printerId: printer.id,
        description,
        cost: cost ?? null,
        hoursAtMaintenance: hoursAtMaintenance ?? Number(printer.totalPrintHours),
      }),
    );
    res.status(201).json(toMaintenanceLogDTO(log));
  }),
);
