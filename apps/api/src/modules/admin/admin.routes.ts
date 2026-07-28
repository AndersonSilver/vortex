import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { getDashboardStats } from "./dashboard.service";
import { listCustomers } from "./customers.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardStats());
  }),
);

adminRouter.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    res.json(await listCustomers());
  }),
);
