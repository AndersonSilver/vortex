import type { StoreSettingsDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { StoreSettings } from "../../entities";

const settingsRepo = () => AppDataSource.getRepository(StoreSettings);

export function toStoreSettingsDTO(settings: StoreSettings): StoreSettingsDTO {
  return {
    storeName: settings.storeName,
    storeEmail: settings.storeEmail,
    storePhone: settings.storePhone,
    storeCnpj: settings.storeCnpj,
    freeShippingThreshold: Number(settings.freeShippingThreshold),
    pixDiscountPercent: Number(settings.pixDiscountPercent),
    boletoDiscountPercent: Number(settings.boletoDiscountPercent),
    installmentsWithoutInterest: settings.installmentsWithoutInterest,
    pixKey: settings.pixKey,
    notifyNewOrder: settings.notifyNewOrder,
    notifyPaymentConfirmed: settings.notifyPaymentConfirmed,
    notifyLowStock: settings.notifyLowStock,
    electricityCostPerKwh: Number(settings.electricityCostPerKwh),
    machineCostPerHour: Number(settings.machineCostPerHour),
    laborCostPerHour: Number(settings.laborCostPerHour),
    defaultWasteRatePercent: Number(settings.defaultWasteRatePercent),
    defaultMarginPercent: Number(settings.defaultMarginPercent),
  };
}

export async function getSettingsEntity(): Promise<StoreSettings> {
  let settings = await settingsRepo().findOneBy({});
  if (!settings) {
    settings = await settingsRepo().save(settingsRepo().create());
  }
  return settings;
}

export async function getSettings(): Promise<StoreSettingsDTO> {
  return toStoreSettingsDTO(await getSettingsEntity());
}
