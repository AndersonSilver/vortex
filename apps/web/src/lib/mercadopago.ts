import { initMercadoPago } from "@mercadopago/sdk-react";

let initialized = false;

export function ensureMercadoPagoInitialized(): void {
  if (initialized) return;
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
  if (!publicKey) return;
  initMercadoPago(publicKey, { locale: "pt-BR" });
  initialized = true;
}
