export type PaymentRequest = {
  orderId: string;
  amount: number;
  payerEmail: string;
  method: "pix" | "card";
};

export type PaymentResult = {
  provider: string;
  externalId: string;
  status: "pending" | "approved" | "rejected";
  qrCode?: string;
  qrCodeBase64?: string;
};

export interface PaymentGateway {
  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  getPayment(externalId: string): Promise<PaymentResult>;
}

export function createPaymentGateway(): PaymentGateway {
  throw new Error("Payment provider is not configured. Implement the official Mercado Pago adapter in Phase 6.");
}
