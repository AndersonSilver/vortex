import { Router } from "express";
import { assetSchema, type AssetDTO, type AssetInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Asset } from "../../entities";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { elapsedDepreciationMonths, monthlyDepreciationOf } from "../expenses/expense-ledger.service";

export const assetsRouter = Router();

const assetRepo = () => AppDataSource.getRepository(Asset);

export function toAssetDTO(asset: Asset): AssetDTO {
  const monthlyDepreciation = monthlyDepreciationOf(asset);
  const today = new Date().toISOString().slice(0, 10);
  const elapsed = elapsedDepreciationMonths(asset, asset.disposedAt ?? today);
  const accumulated = Number((monthlyDepreciation * elapsed).toFixed(2));
  const expectedHours = Number(asset.expectedHoursPerMonth);
  return {
    id: asset.id,
    name: asset.name,
    categoryId: asset.categoryId,
    categoryName: asset.category?.name ?? "",
    printerId: asset.printerId ?? null,
    printerName: asset.printer?.name ?? null,
    status: asset.status,
    acquiredAt: asset.acquiredAt,
    acquisitionCost: Number(asset.acquisitionCost),
    salvageValue: Number(asset.salvageValue),
    usefulLifeMonths: asset.usefulLifeMonths,
    expectedHoursPerMonth: expectedHours,
    notes: asset.notes ?? null,
    disposedAt: asset.disposedAt ?? null,
    monthlyDepreciation: Number(monthlyDepreciation.toFixed(2)),
    accumulatedDepreciation: accumulated,
    bookValue: Number((Number(asset.acquisitionCost) - accumulated).toFixed(2)),
    costPerHour: expectedHours > 0 ? Number((monthlyDepreciation / expectedHours).toFixed(2)) : null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

assetsRouter.use(requireAuth, requireRole("admin"));

assetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { includeRetired } = req.query as { includeRetired?: string };
    const assets = await assetRepo().find({ order: { acquiredAt: "DESC" } });
    const visible = includeRetired === "true" ? assets : assets.filter((asset) => asset.status !== "retired");
    res.json(visible.map(toAssetDTO));
  }),
);

assetsRouter.post(
  "/",
  validateBody(assetSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as AssetInput;
    const asset = await assetRepo().save(assetRepo().create({ ...body }));
    res.status(201).json(toAssetDTO(await assetRepo().findOneByOrFail({ id: asset.id })));
  }),
);

assetsRouter.put(
  "/:id",
  validateBody(assetSchema),
  asyncHandler(async (req, res) => {
    const asset = await assetRepo().findOneBy({ id: req.params.id });
    if (!asset) {
      throw new HttpError(404, "Ativo não encontrado.");
    }
    Object.assign(asset, req.body as AssetInput);
    await assetRepo().save(asset);
    res.json(toAssetDTO(await assetRepo().findOneByOrFail({ id: asset.id })));
  }),
);

/** Baixa do ativo: para de depreciar a partir da data informada. */
assetsRouter.post(
  "/:id/retire",
  asyncHandler(async (req, res) => {
    const asset = await assetRepo().findOneBy({ id: req.params.id });
    if (!asset) {
      throw new HttpError(404, "Ativo não encontrado.");
    }
    asset.status = "retired";
    asset.disposedAt = (req.body?.disposedAt as string) ?? new Date().toISOString().slice(0, 10);
    await assetRepo().save(asset);
    res.json(toAssetDTO(await assetRepo().findOneByOrFail({ id: asset.id })));
  }),
);
