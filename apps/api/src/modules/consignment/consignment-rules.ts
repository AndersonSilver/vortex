import type { ConsignmentMovementType } from "@vortex/shared";
import { HttpError } from "../../utils/async-handler";

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Regras de sinal por tipo: envio só entra, venda e devolução só saem, ajuste vai para
 * qualquer lado. Separado do banco para dar para testar sem Postgres.
 */
export function assertMovementSign(type: ConsignmentMovementType, changeQuantity: number): void {
  if (!Number.isInteger(changeQuantity) || changeQuantity === 0) {
    throw new HttpError(400, "A quantidade precisa ser um número inteiro diferente de zero.");
  }
  if (type === "shipment" && changeQuantity < 0) {
    throw new HttpError(400, "Envio precisa ter quantidade positiva.");
  }
  if ((type === "sale" || type === "return") && changeQuantity > 0) {
    throw new HttpError(400, "Venda e devolução precisam ter quantidade negativa.");
  }
}

export function nextStockQuantity(current: number, changeQuantity: number, productName: string): number {
  const next = current + changeQuantity;
  if (next < 0) {
    throw new HttpError(
      400,
      `Estoque insuficiente de "${productName}" na loja: há ${current} e o movimento pede ${Math.abs(changeQuantity)}.`,
    );
  }
  return next;
}

/** Só a venda gera débito: peças vendidas × repasse vigente. */
export function movementAmount(type: ConsignmentMovementType, changeQuantity: number, transferPrice: number): number {
  return type === "sale" ? roundMoney(Math.abs(changeQuantity) * transferPrice) : 0;
}
