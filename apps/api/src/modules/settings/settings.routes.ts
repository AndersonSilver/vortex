import { Router } from "express";
import { storeSettingsSchema } from "@vortex/shared";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler } from "../../utils/async-handler";
import { getSettings, getSettingsEntity, toStoreSettingsDTO } from "./settings.service";
import { AppDataSource } from "../../config/data-source";
import { StoreSettings } from "../../entities";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getSettings());
  }),
);

settingsRouter.put(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(storeSettingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await getSettingsEntity();
    Object.assign(settings, req.body);
    await AppDataSource.getRepository(StoreSettings).save(settings);
    res.json(toStoreSettingsDTO(settings));
  }),
);
