import { Router } from "express";
import { supplierSchema, type SupplierDTO, type SupplierInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Supplier } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const suppliersRouter = Router();

const supplierRepo = () => AppDataSource.getRepository(Supplier);

export function toSupplierDTO(supplier: Supplier): SupplierDTO {
  return {
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName ?? null,
    phone: supplier.phone ?? null,
    email: supplier.email ?? null,
    notes: supplier.notes ?? null,
    active: supplier.active,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

suppliersRouter.use(requireAuth, requireRole("admin"));

suppliersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeInactive } = req.query as { includeInactive?: string };
    const where = includeInactive === "true" ? {} : { active: true };
    const suppliers = await supplierRepo().find({ where, order: { createdAt: "DESC" } });
    res.json(suppliers.map(toSupplierDTO));
  }),
);

suppliersRouter.post(
  "/",
  validateBody(supplierSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as SupplierInput;
    const supplier = await supplierRepo().save(supplierRepo().create({ ...body }));
    res.status(201).json(toSupplierDTO(supplier));
  }),
);

suppliersRouter.put(
  "/:id",
  validateBody(supplierSchema),
  asyncHandler(async (req, res) => {
    const supplier = await supplierRepo().findOneBy({ id: req.params.id });
    if (!supplier) {
      throw new HttpError(404, "Fornecedor não encontrado.");
    }
    Object.assign(supplier, req.body);
    await supplierRepo().save(supplier);
    res.json(toSupplierDTO(supplier));
  }),
);

suppliersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const supplier = await supplierRepo().findOneBy({ id: req.params.id });
    if (!supplier) {
      throw new HttpError(404, "Fornecedor não encontrado.");
    }
    supplier.active = false;
    await supplierRepo().save(supplier);
    res.status(204).send();
  }),
);
