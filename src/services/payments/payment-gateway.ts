import { getMercadoPagoSettings } from "@/server/payments/payment-settings";

export type PaymentRequest = {
  orderId: string;
  amount: number;
  payerEmail: string;
  method: "pix" | "card";
  description?: string;
  card?: {
    token: string;
    installments: number;
    paymentMethodId: string;
    issuerId?: string;
  };
};

export type PaymentResult = {
  provider: string;
  externalId: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "refunded";
  qrCode?: string;
  qrCodeBase64?: string;
};

export interface PaymentGateway {
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPayment(externalId: string): Promise<PaymentResult>;
}

type MercadoPagoResponse = {
  id?: number | string;
  status?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export type PaymentGatewayOptions = { accessToken?: string; fetchImpl?: typeof fetch };

const paymentEndpoint = "https://api.mercadopago.com/v1/payments";

function accessToken(value?: string) {
  const token = value ?? process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token || token === "replace-with-mercado-pago-access-token") throw new Error("PAYMENT_NOT_CONFIGURED");
  return token;
}

function mapStatus(status: string | undefined): PaymentResult["status"] {
  if (status === "approved") return "approved";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "rejected") return "rejected";
  return "pending";
}

async function parseResponse(response: Response) {
  const body = (await response.json().catch(() => ({}))) as MercadoPagoResponse;
  if (!response.ok || body.id === undefined) throw new Error("PAYMENT_PROVIDER_ERROR");
  return body;
}

export function createPaymentGateway(options: PaymentGatewayOptions = {}): PaymentGateway {
  const token = accessToken(options.accessToken);
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async createPayment(request) {
      if (!Number.isFinite(request.amount) || request.amount <= 0) throw new Error("PAYMENT_INPUT_INVALID");
      if (request.method === "card" && !request.card) throw new Error("PAYMENT_INPUT_INCOMPLETE");
      const body: Record<string, unknown> = {
        transaction_amount: Number(request.amount.toFixed(2)),
        description: request.description ?? `Pedido ${request.orderId}`,
        payer: { email: request.payerEmail },
      };
      if (request.method === "pix") {
        body.payment_method_id = "pix";
      } else {
        body.token = request.card!.token;
        body.installments = request.card!.installments;
        body.payment_method_id = request.card!.paymentMethodId;
        if (request.card!.issuerId) body.issuer_id = request.card!.issuerId;
      }
      const response = await fetchImpl(paymentEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `atw-${request.orderId}` },
        body: JSON.stringify(body),
      });
      const result = await parseResponse(response);
      return { provider: "mercadopago", externalId: String(result.id), status: mapStatus(result.status), qrCode: result.point_of_interaction?.transaction_data?.qr_code, qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 };
    },

    async getPayment(externalId) {
      if (!/^[A-Za-z0-9_-]{1,120}$/.test(externalId)) throw new Error("PAYMENT_INPUT_INVALID");
      const response = await fetchImpl(`${paymentEndpoint}/${encodeURIComponent(externalId)}`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await parseResponse(response);
      return { provider: "mercadopago", externalId: String(result.id), status: mapStatus(result.status), qrCode: result.point_of_interaction?.transaction_data?.qr_code, qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 };
    },
  };
}

export async function createConfiguredPaymentGateway(options: Omit<PaymentGatewayOptions, "accessToken"> = {}) {
  const { accessToken } = await getMercadoPagoSettings();
  return createPaymentGateway({ ...options, accessToken: accessToken ?? undefined });
}
