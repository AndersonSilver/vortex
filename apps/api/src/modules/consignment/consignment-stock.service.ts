import type { EntityManager } from "typeorm";
import type { ConsignmentMovementType } from "@vortex/shared";
import { ConsignmentMovement, ConsignmentStock, Product } from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { assertMovementSign, movementAmount, nextStockQuantity } from "./consignment-rules";

export { roundMoney } from "./consignment-rules";

export interface ConsignmentMovementOptions {
  /** Repasse para o produto. Obrigatório quando a loja ainda não tem o produto. No envio, atualiza o repasse vigente. */
  transferPrice?: number | null;
  note?: string | null;
  userId?: string | null;
  requestId?: string | null;
}

/**
 * Único caminho para mexer no estoque de uma loja consignada. Precisa rodar dentro de
 * uma transação: a linha do estoque é travada com FOR UPDATE para duas vendas simultâneas
 * não passarem do que a loja tem.
 */
export async function applyConsignmentMovement(
  manager: EntityManager,
  storeId: string,
  productId: string,
  type: ConsignmentMovementType,
  changeQuantity: number,
  options: ConsignmentMovementOptions = {},
): Promise<ConsignmentMovement> {
  assertMovementSign(type, changeQuantity);

  const stockRepo = manager.getRepository(ConsignmentStock);
  let stock = await stockRepo
    .createQueryBuilder("stock")
    .setLock("pessimistic_write")
    .where("stock.store_id = :storeId AND stock.product_id = :productId", { storeId, productId })
    .getOne();

  const product = await manager.getRepository(Product).findOneBy({ id: productId });
  if (!product) {
    throw new HttpError(404, "Produto não encontrado.");
  }

  if (!stock) {
    if (changeQuantity < 0) {
      throw new HttpError(400, `A loja não tem "${product.name}" em estoque.`);
    }
    if (!options.transferPrice || options.transferPrice <= 0) {
      throw new HttpError(400, `Informe o repasse de "${product.name}": é a primeira vez que ele vai para essa loja.`);
    }
    stock = stockRepo.create({ storeId, productId, quantity: 0, transferPrice: options.transferPrice });
  } else if (type === "shipment" && options.transferPrice && options.transferPrice > 0) {
    stock.transferPrice = options.transferPrice;
  }

  stock.quantity = nextStockQuantity(Number(stock.quantity), changeQuantity, product.name);
  await stockRepo.save(stock);

  const transferPrice = Number(stock.transferPrice);
  const movementRepo = manager.getRepository(ConsignmentMovement);
  return movementRepo.save(
    movementRepo.create({
      storeId,
      productId,
      type,
      changeQuantity,
      transferPrice,
      amount: movementAmount(type, changeQuantity, transferPrice),
      note: options.note ?? null,
      createdByUserId: options.userId ?? null,
      requestId: options.requestId ?? null,
    }),
  );
}
