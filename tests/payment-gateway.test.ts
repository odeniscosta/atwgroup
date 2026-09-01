import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentGateway } from "@/services/payments/payment-gateway";

test("Mercado Pago adapter creates PIX with server-side auth and idempotency", async () => {
  let captured: { url: string; init?: RequestInit } | undefined;
  const gateway = createPaymentGateway({ accessToken: "test-token", fetchImpl: async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({ id: 123, status: "pending", point_of_interaction: { transaction_data: { qr_code: "pix-code", qr_code_base64: "pix-image" } } }), { status: 201 });
  } });
  const result = await gateway.createPayment({ orderId: "ATW-1", amount: 19.9, payerEmail: "cliente@example.com", method: "pix" });
  assert.deepEqual(result, { provider: "mercadopago", externalId: "123", status: "pending", qrCode: "pix-code", qrCodeBase64: "pix-image" });
  assert.equal(captured?.url, "https://api.mercadopago.com/v1/payments");
  assert.equal(new Headers(captured?.init?.headers).get("Authorization"), "Bearer test-token");
  assert.equal(new Headers(captured?.init?.headers).get("X-Idempotency-Key"), "atw-ATW-1");
  assert.equal(JSON.parse(String(captured?.init?.body)).payment_method_id, "pix");
});

test("Mercado Pago adapter refuses incomplete card data", async () => {
  const gateway = createPaymentGateway({ accessToken: "test-token", fetchImpl: async () => new Response("{}", { status: 500 }) });
  await assert.rejects(() => gateway.createPayment({ orderId: "ATW-2", amount: 10, payerEmail: "cliente@example.com", method: "card" }), { message: "PAYMENT_INPUT_INCOMPLETE" });
});

test("Mercado Pago adapter maps approved status", async () => {
  const gateway = createPaymentGateway({ accessToken: "test-token", fetchImpl: async () => new Response(JSON.stringify({ id: "abc", status: "approved" }), { status: 200 }) });
  assert.equal((await gateway.getPayment("abc")).status, "approved");
});
