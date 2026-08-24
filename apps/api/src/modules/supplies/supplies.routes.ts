import { Router } from "express";
import {
  supplyMovementSchema,
  supplySchema,
  supplyUpdateSchema,
  type SupplyDTO,
  type SupplyInput,
  type SupplyMovementDTO,
  type SupplyMovementInput,
  type SupplyUpdateInput,
} from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Supply, SupplyMovement } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { applySupplyMovement } from "./supply-stock.service";

export const suppliesRouter = Router();

const supplyRepo = () => AppDataSource.getRepository(Supply);
const movementRepo = () => AppDataSource.getRepository(SupplyMovement);

export function toSupplyDTO(supply: Supply): SupplyDTO {
  const quantityOnHand = Number(supply.quantityOnHand);
  const avgUnitCost = Number(supply.avgUnitCost);
  const lowStockThreshold = Number(supply.lowStockThreshold);
  return {
    id: supply.id,
    name: supply.name,
    categoryId: supply.categoryId,
    categoryName: supply.category?.name ?? "",
    unit: supply.unit,
    quantityOnHand,
    avgUnitCost,
    lowStockThreshold,
    supplierId: supply.supplierId ?? null,
    supplierName: supply.supplier?.name ?? null,
    notes: supply.notes ?? null,
    active: supply.active,
    stockValue: Number((quantityOnHand * avgUnitCost).toFixed(2)),
    lowStock: lowStockThreshold > 0 && quantityOnHand <= lowStockThreshold,
    createdAt: supply.createdAt.toISOString(),
    updatedAt: supply.updatedAt.toISOString(),
  };
}

function toMovementDTO(movement: SupplyMovement): SupplyMovementDTO {
  return {
    id: movement.id,
    supplyId: movement.supplyId,
    type: movement.type,
    changeQuantity: Number(movement.changeQuantity),
    unitCost: movement.unitCost !== null && movement.unitCost !== undefined ? Number(movement.unitCost) : null,
    reason: movement.reason ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}

suppliesRouter.use(requireAuth, requireRole("admin"));

suppliesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const supplies = await supplyRepo().find({ where, order: { name: "ASC" } });
    res.json(supplies.map(toSupplyDTO));
  }),
);

suppliesRouter.post(
  "/",
  validateBody(supplySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SupplyInput;
    const supply = await supplyRepo().save(supplyRepo().create({ ...body }));
    const withRelations = await supplyRepo().findOneByOrFail({ id: supply.id });
    res.status(201).json(toSupplyDTO(withRelations));
  }),
);

suppliesRouter.put(
  "/:id",
  validateBody(supplyUpdateSchema),
  asyncHandler(async (req, res) => {
    const supply = await supplyRepo().findOneBy({ id: req.params.id });
    if (!supply) {
      throw new HttpError(404, "Insumo não encontrado.");
    }
    // Quantidade e custo médio só mudam por movimentação, para o histórico fechar.
    Object.assign(supply, req.body as SupplyUpdateInput);
    await supplyRepo().save(supply);
    res.json(toSupplyDTO(await supplyRepo().findOneByOrFail({ id: supply.id })));
  }),
);

suppliesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const supply = await supplyRepo().findOneBy({ id: req.params.id });
    if (!supply) {
      throw new HttpError(404, "Insumo não encontrado.");
    }
    supply.active = false;
    await supplyRepo().save(supply);
    res.status(204).send();
  }),
);

suppliesRouter.get(
  "/:id/movements",
  asyncHandler(async (req, res) => {
    const movements = await movementRepo().find({
      where: { supplyId: req.params.id },
      order: { createdAt: "DESC" },
      take: 100,
    });
    res.json(movements.map(toMovementDTO));
  }),
);

suppliesRouter.post(
  "/:id/movements",
  validateBody(supplyMovementSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SupplyMovementInput;
    const movement = await applySupplyMovement(
      req.params.id,
      body.changeQuantity,
      body.type,
      body.unitCost ?? null,
      body.reason ?? null,
    );
    res.status(201).json(toMovementDTO(movement));
  }),
);
