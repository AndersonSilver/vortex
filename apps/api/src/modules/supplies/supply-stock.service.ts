import type { EntityManager } from "typeorm";
import type { SupplyMovementType } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Supply, SupplyMovement } from "../../entities";
import { HttpError } from "../../utils/async-handler";

const supplyRepo = (manager?: EntityManager) => (manager ?? AppDataSource.manager).getRepository(Supply);
const movementRepo = (manager?: EntityManager) => (manager ?? AppDataSource.manager).getRepository(SupplyMovement);

/**
 * Movimenta o estoque do insumo. Em entradas com custo informado, o custo médio
 * móvel é recalculado; em saídas, o custo médio não muda.
 */
export async function applySupplyMovement(
  supplyId: string,
  changeQuantity: number,
  type: SupplyMovementType,
  unitCost?: number | null,
  reason?: string | null,
  manager?: EntityManager,
): Promise<SupplyMovement> {
  const supply = await supplyRepo(manager).findOneBy({ id: supplyId });
  if (!supply) {
    throw new HttpError(404, "Insumo não encontrado.");
  }
  const onHand = Number(supply.quantityOnHand);
  const nextQuantity = onHand + changeQuantity;
  if (nextQuantity < 0) {
    throw new HttpError(400, "A movimentação deixaria o estoque do insumo negativo.");
  }

  if (changeQuantity > 0 && unitCost !== null && unitCost !== undefined) {
    const currentAvg = Number(supply.avgUnitCost);
    const weighted = (onHand * currentAvg + changeQuantity * unitCost) / nextQuantity;
    supply.avgUnitCost = Number(weighted.toFixed(4));
  }
  supply.quantityOnHand = Number(nextQuantity.toFixed(3));
  await supplyRepo(manager).save(supply);

  return movementRepo(manager).save(
    movementRepo(manager).create({
      supplyId,
      type,
      changeQuantity,
      unitCost: unitCost ?? null,
      reason: reason ?? null,
    }),
  );
}
