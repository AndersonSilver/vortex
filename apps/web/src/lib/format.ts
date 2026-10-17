/** Valor em reais no formato brasileiro: brl(1234.5) → "R$ 1.234,50". */
export function brl(value: number, fractionDigits = 2): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
