import axios from "axios";
import type { ShippingQuoteOption } from "@vortex/shared";
import { env } from "../../config/env";

interface PackageDimensions {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

interface MelhorEnvioQuote {
  id: number;
  name: string;
  price: string;
  delivery_time: number;
  company?: { id: number; name: string };
  error?: string | null;
}

async function callMelhorEnvio(
  cepDestino: string,
  pkg: PackageDimensions,
): Promise<MelhorEnvioQuote[] | null> {
  if (!env.shipping.melhorEnvio.token) return null;
  try {
    const { data } = await axios.post<MelhorEnvioQuote[]>(
      `${env.shipping.melhorEnvio.baseUrl}/me/shipment/calculate`,
      {
        from: { postal_code: env.shipping.cepOrigem.replace(/\D/g, "") },
        to: { postal_code: cepDestino.replace(/\D/g, "") },
        products: [
          {
            id: "1",
            width: Math.max(pkg.widthCm, 11),
            height: Math.max(pkg.heightCm, 2),
            length: Math.max(pkg.lengthCm, 16),
            weight: Math.max(pkg.weightKg, 0.3),
            insurance_value: 0,
            quantity: 1,
          },
        ],
      },
      {
        timeout: 6000,
        headers: {
          Authorization: `Bearer ${env.shipping.melhorEnvio.token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Vórtex 3D (contato@vortex3d.com.br)",
        },
      },
    );
    return Array.isArray(data) ? data : null;
  } catch (error) {
    console.warn("Melhor Envio: falha ao calcular frete, usando fallback.", (error as Error).message);
    return null;
  }
}

function findService(quotes: MelhorEnvioQuote[], nameIncludes: string): MelhorEnvioQuote | undefined {
  return quotes.find(
    (q) =>
      !q.error &&
      q.company?.name?.toLowerCase().includes("correios") &&
      q.name?.toLowerCase().includes(nameIncludes),
  );
}

export async function quoteShipping(
  cepDestino: string,
  pkg: PackageDimensions,
): Promise<ShippingQuoteOption[]> {
  const quotes = await callMelhorEnvio(cepDestino, pkg);
  const pac = quotes ? findService(quotes, "pac") : undefined;
  const sedex = quotes ? findService(quotes, "sedex") : undefined;

  const options: ShippingQuoteOption[] = [
    pac
      ? {
          method: "pac",
          label: "PAC",
          price: Number(pac.price),
          estimatedDays: pac.delivery_time,
          source: "correios",
        }
      : {
          method: "pac",
          label: "PAC",
          price: env.shipping.fallback.pacPrice,
          estimatedDays: env.shipping.fallback.pacDays,
          source: "fallback",
        },
    sedex
      ? {
          method: "sedex",
          label: "SEDEX",
          price: Number(sedex.price),
          estimatedDays: sedex.delivery_time,
          source: "correios",
        }
      : {
          method: "sedex",
          label: "SEDEX",
          price: env.shipping.fallback.sedexPrice,
          estimatedDays: env.shipping.fallback.sedexDays,
          source: "fallback",
        },
    { method: "pickup", label: "Retirada no local", price: 0, estimatedDays: 0, source: "pickup" },
  ];

  return options;
}
