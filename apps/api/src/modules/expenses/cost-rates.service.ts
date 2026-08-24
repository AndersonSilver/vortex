import { MoreThanOrEqual } from "typeorm";
import type { CostRatesDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Asset, PrinterMaintenanceLog, RecurringExpense, StoreSettings } from "../../entities";
import { getSettingsEntity } from "../settings/settings.service";
import { monthlyDepreciationOf, normalizedMonthlyAmount } from "./expense-ledger.service";

const assetRepo = () => AppDataSource.getRepository(Asset);
const recurringRepo = () => AppDataSource.getRepository(RecurringExpense);
const maintenanceRepo = () => AppDataSource.getRepository(PrinterMaintenanceLog);

const MAINTENANCE_WINDOW_MONTHS = 6;

/** Ativo tratado como máquina: ligado a uma impressora ou com horas previstas. */
function isMachine(asset: Asset): boolean {
  return Boolean(asset.printerId) || Number(asset.expectedHoursPerMonth) > 0;
}

/**
 * Deriva as taxas horárias dos gastos reais cadastrados, para a precificação
 * deixar de usar valores chutados à mão.
 */
export async function getCostRates(): Promise<CostRatesDTO> {
  const settings = await getSettingsEntity();
  const assets = await assetRepo().find({ where: { status: "active" } });
  const recurring = await recurringRepo().find({ where: { active: true } });

  let machineDepreciation = 0;
  let otherDepreciation = 0;
  let printerHoursPerMonth = 0;
  for (const asset of assets) {
    const monthly = monthlyDepreciationOf(asset);
    if (isMachine(asset)) {
      machineDepreciation += monthly;
      printerHoursPerMonth += Number(asset.expectedHoursPerMonth);
    } else {
      otherDepreciation += monthly;
    }
  }

  const monthlyFixedExpenses = recurring.reduce((sum, expense) => sum + normalizedMonthlyAmount(expense), 0);

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - MAINTENANCE_WINDOW_MONTHS);
  const maintenanceLogs = await maintenanceRepo().find({ where: { createdAt: MoreThanOrEqual(windowStart) } });
  const monthlyMaintenance =
    maintenanceLogs.reduce((sum, log) => sum + Number(log.cost ?? 0), 0) / MAINTENANCE_WINDOW_MONTHS;

  const productiveHoursPerMonth = settings.overheadHoursPerMonth > 0 ? settings.overheadHoursPerMonth : 160;
  const machineHours = printerHoursPerMonth > 0 ? printerHoursPerMonth : productiveHoursPerMonth;

  return {
    monthlyDepreciation: Number((machineDepreciation + otherDepreciation).toFixed(2)),
    monthlyFixedExpenses: Number(monthlyFixedExpenses.toFixed(2)),
    monthlyMaintenance: Number(monthlyMaintenance.toFixed(2)),
    productiveHoursPerMonth,
    printerHoursPerMonth: Number(machineHours.toFixed(2)),
    suggestedMachineCostPerHour: Number(((machineDepreciation + monthlyMaintenance) / machineHours).toFixed(2)),
    suggestedOverheadCostPerHour: Number(
      ((monthlyFixedExpenses + otherDepreciation) / productiveHoursPerMonth).toFixed(2),
    ),
    configuredMachineCostPerHour: Number(settings.machineCostPerHour),
    configuredOverheadCostPerHour: Number(settings.overheadCostPerHour),
    autoCostRates: settings.autoCostRates,
    assetsCount: assets.length,
    recurringCount: recurring.length,
  };
}

/** Grava as taxas sugeridas nas configurações da loja. */
export async function applySuggestedCostRates(): Promise<CostRatesDTO> {
  const rates = await getCostRates();
  const settings = await getSettingsEntity();
  settings.machineCostPerHour = rates.suggestedMachineCostPerHour;
  settings.overheadCostPerHour = rates.suggestedOverheadCostPerHour;
  await AppDataSource.getRepository(StoreSettings).save(settings);
  return getCostRates();
}
