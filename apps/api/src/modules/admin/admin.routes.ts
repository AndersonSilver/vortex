import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { getDashboardStats } from "./dashboard.service";
import { listCustomers } from "./customers.service";
import { getProductProfitReport, getSalesReport } from "./reports.service";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get(
  "/dashboard",
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardStats());
  }),
);

function parseReportRange(query: { from?: string; to?: string }): { from: Date; to: Date } {
  const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
  const from = query.from
    ? new Date(`${query.from}T00:00:00`)
    : new Date(new Date(to).setDate(to.getDate() - 29));
  return { from, to };
}

adminRouter.get(
  "/reports/products",
  asyncHandler(async (req, res) => {
    const { from, to } = parseReportRange(req.query as { from?: string; to?: string });
    res.json(await getProductProfitReport(from, to));
  }),
);

adminRouter.get(
  "/reports/sales",
  asyncHandler(async (req, res) => {
    const { from, to } = parseReportRange(req.query as { from?: string; to?: string });
    res.json(await getSalesReport(from, to));
  }),
);

adminRouter.get(
  "/customers",
  asyncHandler(async (_req, res) => {
    res.json(await listCustomers());
  }),
);
