import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CardPayment } from "@mercadopago/sdk-react";
import type { PaymentResultDTO } from "@vortex/shared";
import { useOrder } from "../hooks/useOrders";
import { useCreatePayment } from "../hooks/usePayments";
import { useToast } from "../components/Toast";
import { ensureMercadoPagoInitialized } from "../lib/mercadopago";

export function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: order, refetch } = useOrder(orderId);
  const createPayment = useCreatePayment(orderId);
  const { showToast } = useToast();
  const [payerCpf, setPayerCpf] = useState("");
  const [autoResult, setAutoResult] = useState<PaymentResultDTO | null>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    ensureMercadoPagoInitialized();
  }, []);

  useEffect(() => {
    if (!order || triggered) return;
    if (order.paymentMethod === "pix") {
      setTriggered(true);
      createPayment.mutate(
        { method: "pix" },
        {
          onSuccess: setAutoResult,
          onError: () => showToast("Não foi possível gerar o PIX. Tente novamente.", "error"),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, triggered]);

  useEffect(() => {
    if (!order) return;
    if (order.paymentStatus === "approved") {
      navigate(`/pedido/${orderId}/sucesso`);
      return;
    }
    if (order.paymentStatus === "pending") {
      const timer = setInterval(() => refetch(), 4000);
      return () => clearInterval(timer);
    }
  }, [order, orderId, navigate, refetch]);

  function handleBoletoGenerate() {
    createPayment.mutate(
      { method: "boleto", payerCpf },
      {
        onSuccess: setAutoResult,
        onError: () => showToast("Não foi possível gerar o boleto. Verifique o CPF informado.", "error"),
      },
    );
  }

  async function handleCardSubmit(formData: {
    token: string;
    installments: number;
    payment_method_id: string;
    issuer_id?: string;
  }) {
    try {
      await createPayment.mutateAsync({
        method: "card",
        cardToken: formData.token,
        installments: formData.installments,
        paymentMethodId: formData.payment_method_id,
        issuerId: formData.issuer_id,
        payerCpf,
      });
      showToast("Pagamento processado!", "success");
    } catch {
      showToast("Pagamento recusado. Tente outro cartão.", "error");
      throw new Error("payment-failed");
    }
  }

  if (!order) {
    return (
      <div className="checkout-page">
        <div className="container">
          <p style={{ color: "var(--text-muted)" }}>Carregando pedido...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="container" style={{ maxWidth: "600px" }}>
        <div className="checkout-form">
          <h2>💳 Pagamento — Pedido {order.orderNumber}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: ".9rem", marginBottom: "1.5rem" }}>
            Total a pagar: <strong style={{ color: "var(--purple)" }}>R$ {order.total.toFixed(2)}</strong>
          </p>

          {order.paymentMethod === "pix" && (
            <div
              style={{
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.2rem",
                textAlign: "center",
              }}
            >
              {!autoResult ? (
                <p style={{ color: "var(--text-muted)" }}>Gerando QR Code PIX...</p>
              ) : (
                <>
                  <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>📱</div>
                  {autoResult.qrCodeBase64 && (
                    <img
                      src={`data:image/png;base64,${autoResult.qrCodeBase64}`}
                      alt="QR Code PIX"
                      style={{ width: "220px", height: "220px", margin: "0 auto 1rem" }}
                    />
                  )}
                  <p style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>
                    Escaneie o QR Code ou copie o código abaixo no app do seu banco.
                  </p>
                  {autoResult.qrCode && (
                    <div
                      style={{
                        background: "var(--bg2)",
                        borderRadius: "8px",
                        padding: ".8rem",
                        marginTop: ".8rem",
                        fontFamily: "monospace",
                        fontSize: ".72rem",
                        color: "var(--purple-light)",
                        wordBreak: "break-all",
                      }}
                    >
                      {autoResult.qrCode}
                    </div>
                  )}
                  <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                    Aguardando confirmação do pagamento...
                  </p>
                </>
              )}
            </div>
          )}

          {order.paymentMethod === "boleto" && (
            <div>
              {!autoResult ? (
                <>
                  <div className="form-group">
                    <label>CPF do pagador</label>
                    <input
                      placeholder="000.000.000-00"
                      value={payerCpf}
                      onChange={(e) => setPayerCpf(e.target.value)}
                    />
                  </div>
                  <button className="btn-place-order" onClick={handleBoletoGenerate} disabled={createPayment.isPending}>
                    Gerar Boleto
                  </button>
                </>
              ) : (
                <div
                  style={{
                    background: "var(--bg3)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "1.2rem",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: ".5rem" }}>📄</div>
                  <p style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>
                    Boleto gerado. Vence em 3 dias úteis.
                  </p>
                  {autoResult.ticketUrl && (
                    <a
                      href={autoResult.ticketUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline"
                      style={{ display: "inline-block", marginTop: "1rem" }}
                    >
                      Ver / Imprimir Boleto
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {order.paymentMethod === "card" && (
            <div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label>CPF do titular do cartão</label>
                <input
                  placeholder="000.000.000-00"
                  value={payerCpf}
                  onChange={(e) => setPayerCpf(e.target.value)}
                />
              </div>
              <CardPayment
                initialization={{ amount: order.total }}
                onSubmit={handleCardSubmit}
                onError={(error) => console.error("Mercado Pago CardPayment error", error)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
