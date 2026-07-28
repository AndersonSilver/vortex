import { Router } from "express";
import {
  filamentMovementSchema,
  filamentSchema,
  filamentUpdateSchema,
  type FilamentDTO,
  type FilamentInput,
  type FilamentMovementDTO,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Filament, FilamentMovement } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { applyFilamentMovement } from "./filament-stock.service";

export const filamentsRouter = Router();

const filamentRepo = () => AppDataSource.getRepository(Filament);
const movementRepo = () => AppDataSource.getRepository(FilamentMovement);

function toFilamentDTO(filament: Filament): FilamentDTO {
  return {
    id: filament.id,
    brand: filament.brand,
    material: filament.material,
    color: filament.color,
    colorHex: filament.colorHex ?? null,
    spoolWeightGrams: filament.spoolWeightGrams,
    remainingWeightGrams: filament.remainingWeightGrams,
    costPerSpool: Number(filament.costPerSpool),
    lowStockThresholdGrams: filament.lowStockThresholdGrams,
    supplierId: filament.supplierId ?? null,
    supplierName: filament.supplier?.name ?? null,
    notes: filament.notes ?? null,
    active: filament.active,
    createdAt: filament.createdAt.toISOString(),
    updatedAt: filament.updatedAt.toISOString(),
  };
}

function toFilamentMovementDTO(movement: FilamentMovement): FilamentMovementDTO {
  return {
    id: movement.id,
    filamentId: movement.filamentId,
    type: movement.type,
    changeGrams: movement.changeGrams,
    reason: movement.reason ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}

filamentsRouter.use(requireAuth, requireRole("admin"));

filamentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const filaments = await filamentRepo().find({ where, order: { createdAt: "DESC" } });
    res.json(filaments.map(toFilamentDTO));
  }),
);

filamentsRouter.post(
  "/",
  validateBody(filamentSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as FilamentInput;
    const saved = await filamentRepo().save(filamentRepo().create({ ...body }));
    const filament = await filamentRepo().findOneByOrFail({ id: saved.id });
    res.status(201).json(toFilamentDTO(filament));
  }),
);

filamentsRouter.put(
  "/:id",
  validateBody(filamentUpdateSchema),
  asyncHandler(async (req, res) => {
    const filament = await filamentRepo().findOneBy({ id: req.params.id });
    if (!filament) {
      throw new HttpError(404, "Filamento não encontrado.");
    }
    Object.assign(filament, req.body);
    await filamentRepo().save(filament);
    const updated = await filamentRepo().findOneByOrFail({ id: filament.id });
    res.json(toFilamentDTO(updated));
  }),
);

filamentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const filament = await filamentRepo().findOneBy({ id: req.params.id });
    if (!filament) {
      throw new HttpError(404, "Filamento não encontrado.");
    }
    filament.active = false;
    await filamentRepo().save(filament);
    res.status(204).send();
  }),
);

filamentsRouter.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const movements = await movementRepo().find({
      where: { filamentId: req.params.id },
      order: { createdAt: "DESC" },
    });
    res.json(movements.map(toFilamentMovementDTO));
  }),
);

filamentsRouter.post(
  "/:id/movements",
  validateBody(filamentMovementSchema),
  asyncHandler(async (req, res) => {
    const { type, changeGrams, reason } = req.body as {
      type: FilamentMovementDTO["type"];
      changeGrams: number;
      reason?: string;
    };
    const movement = await applyFilamentMovement(req.params.id, changeGrams, type, reason);
    res.status(201).json(toFilamentMovementDTO(movement));
  }),
);
