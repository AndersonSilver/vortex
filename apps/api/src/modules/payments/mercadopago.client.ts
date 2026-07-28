import { MercadoPagoConfig, Payment as MpPayment } from "mercadopago";
import { env } from "../../config/env";

export const mpClient = new MercadoPagoConfig({
  accessToken: env.mercadoPago.accessToken,
  options: { timeout: 8000 },
});

export const mpPaymentApi = new MpPayment(mpClient);
