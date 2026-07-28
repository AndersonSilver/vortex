import type { CreatePaymentInput, PaymentResultDTO, PaymentStatus } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Order, Payment } from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { mpPaymentApi } from "./mercadopago.client";

const paymentRepo = () => AppDataSource.getRepository(Payment);
const orderRepo = () => AppDataSource.getRepository(Order);

function mapMpStatus(mpStatus: string | undefined): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

function toPaymentResultDTO(payment: Payment, mpResponse?: Record<string, any>): PaymentResultDTO {
  const poi = mpResponse?.point_of_interaction?.transaction_data;
  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    mpPaymentId: payment.mpPaymentId ?? null,
    qrCode: poi?.qr_code ?? null,
    qrCodeBase64: poi?.qr_code_base64 ?? null,
    ticketUrl: poi?.ticket_url ?? mpResponse?.transaction_details?.external_resource_url ?? null,
    barcode: mpResponse?.barcode?.content ?? null,
  };
}

export async function createPaymentForOrder(
  userId: string,
  orderId: string,
  input: CreatePaymentInput,
): Promise<PaymentResultDTO> {
  const order = await orderRepo().findOneBy({ id: orderId, userId });
  if (!order) {
    throw new HttpError(404, "Pedido não encontrado.");
  }
  if (order.paymentStatus === "approved") {
    throw new HttpError(409, "Este pedido já foi pago.");
  }
  if (order.paymentMethod !== input.method) {
    throw new HttpError(400, "Método de pagamento não confere com o pedido.");
  }

  const [firstName, ...rest] = order.customerName.split(" ");
  const lastName = rest.join(" ") || firstName;

  let body: Record<string, unknown>;

  if (input.method === "pix") {
    body = {
      transaction_amount: Number(order.total),
      description: `Pedido ${order.orderNumber} — Vórtex 3D`,
      payment_method_id: "pix",
      external_reference: order.id,
      payer: {
        email: order.customerEmail,
        first_name: input.payerFirstName ?? firstName,
        last_name: input.payerLastName ?? lastName,
      },
    };
  } else if (input.method === "boleto") {
    if (!input.payerCpf) {
      throw new HttpError(400, "CPF é obrigatório para pagamento via boleto.");
    }
    if (!order.addressSnapshot) {
      throw new HttpError(400, "Endereço do pedido não encontrado para gerar o boleto.");
    }
    body = {
      transaction_amount: Number(order.total),
      description: `Pedido ${order.orderNumber} — Vórtex 3D`,
      payment_method_id: "bolbradesco",
      external_reference: order.id,
      payer: {
        email: order.customerEmail,
        first_name: input.payerFirstName ?? firstName,
        last_name: input.payerLastName ?? lastName,
        identification: { type: "CPF", number: input.payerCpf.replace(/\D/g, "") },
        address: {
          zip_code: order.addressSnapshot.cep.replace(/\D/g, ""),
          street_name: order.addressSnapshot.street,
          street_number: order.addressSnapshot.number,
          neighborhood: order.addressSnapshot.neighborhood,
          city: order.addressSnapshot.city,
          federal_unit: order.addressSnapshot.state,
        },
      },
    };
  } else {
    if (!input.cardToken || !input.paymentMethodId) {
      throw new HttpError(400, "Dados do cartão inválidos.");
    }
    body = {
      transaction_amount: Number(order.total),
      token: input.cardToken,
      description: `Pedido ${order.orderNumber} — Vórtex 3D`,
      installments: input.installments ?? 1,
      payment_method_id: input.paymentMethodId,
      issuer_id: input.issuerId,
      external_reference: order.id,
      payer: {
        email: order.customerEmail,
        identification: input.payerCpf
          ? { type: "CPF", number: input.payerCpf.replace(/\D/g, "") }
          : undefined,
      },
    };
  }

  let mpResponse: Record<string, any>;
  try {
    mpResponse = (await mpPaymentApi.create({ body: body as never })) as unknown as Record<
      string,
      any
    >;
  } catch (error) {
    console.error("Mercado Pago payment creation failed", error);
    throw new HttpError(502, "Falha ao processar pagamento no Mercado Pago.");
  }

  const status = mapMpStatus(mpResponse.status);
  const payment = await paymentRepo().save(
    paymentRepo().create({
      orderId: order.id,
      provider: "mercadopago",
      mpPaymentId: String(mpResponse.id),
      method: input.method,
      status,
      amount: Number(order.total),
      rawPayload: mpResponse,
    }),
  );

  order.paymentStatus = status;
  if (status === "approved") order.status = "printing";
  if (status === "rejected" || status === "cancelled") order.status = "cancelled";
  await orderRepo().save(order);

  return toPaymentResultDTO(payment, mpResponse);
}

export async function handleWebhookNotification(mpPaymentId: string): Promise<void> {
  let mpResponse: Record<string, any>;
  try {
    mpResponse = (await mpPaymentApi.get({ id: mpPaymentId })) as unknown as Record<string, any>;
  } catch (error) {
    console.error("Failed to fetch payment from Mercado Pago webhook", error);
    return;
  }

  const payment = await paymentRepo().findOneBy({ mpPaymentId });
  if (!payment) return;

  const status = mapMpStatus(mpResponse.status);
  payment.status = status;
  payment.rawPayload = mpResponse;
  await paymentRepo().save(payment);

  const order = await orderRepo().findOneBy({ id: payment.orderId });
  if (!order) return;
  order.paymentStatus = status;
  if (status === "approved" && order.status === "pending") order.status = "printing";
  if (status === "rejected" || status === "cancelled") order.status = "cancelled";
  await orderRepo().save(order);
}
