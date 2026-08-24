import type { EntityManager } from "typeorm";
import type { FilamentMovementType } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Filament, FilamentMovement } from "../../entities";
import { HttpError } from "../../utils/async-handler";

const filamentRepo = (manager?: EntityManager) =>
  (manager ?? AppDataSource.manager).getRepository(Filament);
const movementRepo = (manager?: EntityManager) =>
  (manager ?? AppDataSource.manager).getRepository(FilamentMovement);

export async function applyFilamentMovement(
  filamentId: string,
  changeGrams: number,
  type: FilamentMovementType,
  reason?: string | null,
  manager?: EntityManager,
): Promise<FilamentMovement> {
  const filament = await filamentRepo(manager).findOneBy({ id: filamentId });
  if (!filament) {
    throw new HttpError(404, "Filamento não encontrado.");
  }
  const nextWeight = filament.remainingWeightGrams + changeGrams;
  if (nextWeight < 0) {
    throw new HttpError(400, "A movimentação deixaria o estoque negativo.");
  }
  filament.remainingWeightGrams = nextWeight;
  await filamentRepo(manager).save(filament);
  return movementRepo(manager).save(
    movementRepo(manager).create({ filamentId, type, changeGrams, reason: reason ?? null }),
  );
}

/**
 * Recalcula o custo do rolo pela média móvel ponderada em gramas, para o custo
 * do filamento em estoque refletir o que foi pago de verdade (frete incluso).
 */
export async function updateFilamentCostFromPurchase(
  filamentId: string,
  incomingGrams: number,
  incomingCost: number,
  previousGrams: number,
  manager?: EntityManager,
): Promise<void> {
  if (incomingGrams <= 0) {
    return;
  }
  const filament = await filamentRepo(manager).findOneBy({ id: filamentId });
  if (!filament) {
    return;
  }
  const spoolWeight = filament.spoolWeightGrams > 0 ? filament.spoolWeightGrams : 1000;
  const oldCostPerGram = Number(filament.costPerSpool) / spoolWeight;
  const newCostPerGram = incomingCost / incomingGrams;
  const baseGrams = Math.max(previousGrams, 0);
  const weightedCostPerGram =
    baseGrams + incomingGrams > 0
      ? (baseGrams * oldCostPerGram + incomingGrams * newCostPerGram) / (baseGrams + incomingGrams)
      : newCostPerGram;
  filament.costPerSpool = Number((weightedCostPerGram * spoolWeight).toFixed(2));
  await filamentRepo(manager).save(filament);
}
