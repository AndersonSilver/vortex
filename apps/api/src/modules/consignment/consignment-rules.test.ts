import { describe, expect, it } from "vitest";
import { assertMovementSign, movementAmount, nextStockQuantity, roundMoney } from "./consignment-rules";

describe("assertMovementSign", () => {
  it("aceita envio positivo e venda/devolução negativas", () => {
    expect(() => assertMovementSign("shipment", 5)).not.toThrow();
    expect(() => assertMovementSign("sale", -2)).not.toThrow();
    expect(() => assertMovementSign("return", -1)).not.toThrow();
  });

  it("aceita ajuste para os dois lados", () => {
    expect(() => assertMovementSign("adjustment", 3)).not.toThrow();
    expect(() => assertMovementSign("adjustment", -3)).not.toThrow();
  });

  it("recusa sinal trocado, zero e fração", () => {
    expect(() => assertMovementSign("shipment", -1)).toThrow("Envio precisa ter quantidade positiva.");
    expect(() => assertMovementSign("sale", 2)).toThrow("Venda e devolução precisam ter quantidade negativa.");
    expect(() => assertMovementSign("return", 1)).toThrow("Venda e devolução precisam ter quantidade negativa.");
    expect(() => assertMovementSign("adjustment", 0)).toThrow();
    expect(() => assertMovementSign("sale", -1.5)).toThrow();
  });
});

describe("nextStockQuantity", () => {
  it("soma o movimento ao estoque atual", () => {
    expect(nextStockQuantity(5, -2, "Vaso")).toBe(3);
    expect(nextStockQuantity(0, 4, "Vaso")).toBe(4);
    expect(nextStockQuantity(2, -2, "Vaso")).toBe(0);
  });

  it("recusa deixar o estoque negativo e diz quanto tem", () => {
    expect(() => nextStockQuantity(1, -3, "Vaso")).toThrow('Estoque insuficiente de "Vaso" na loja: há 1 e o movimento pede 3.');
  });
});

describe("movementAmount", () => {
  it("só a venda gera débito, pelo repasse vigente", () => {
    expect(movementAmount("sale", -3, 19.9)).toBe(59.7);
    expect(movementAmount("shipment", 3, 19.9)).toBe(0);
    expect(movementAmount("return", -3, 19.9)).toBe(0);
    expect(movementAmount("adjustment", -3, 19.9)).toBe(0);
  });

  it("arredonda para centavos", () => {
    expect(movementAmount("sale", -3, 0.1)).toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
