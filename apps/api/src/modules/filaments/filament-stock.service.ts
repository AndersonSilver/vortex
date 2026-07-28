import type { FilamentMovementType } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Filament, FilamentMovement } from "../../entities";
import { HttpError } from "../../utils/async-handler";

const filamentRepo = () => AppDataSource.getRepository(Filament);
const movementRepo = () => AppDataSource.getRepository(FilamentMovement);

export async function applyFilamentMovement(
  filamentId: string,
  changeGrams: number,
  type: FilamentMovementType,
  reason?: string | null,
): Promise<FilamentMovement> {
  const filament = await filamentRepo().findOneBy({ id: filamentId });
  if (!filament) {
    throw new HttpError(404, "Filamento não encontrado.");
  }
  const nextWeight = filament.remainingWeightGrams + changeGrams;
  if (nextWeight < 0) {
    throw new HttpError(400, "A movimentação deixaria o estoque negativo.");
  }
  filament.remainingWeightGrams = nextWeight;
  await filamentRepo().save(filament);
  return movementRepo().save(movementRepo().create({ filamentId, type, changeGrams, reason: reason ?? null }));
}
