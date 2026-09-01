import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyMercadoPagoSignature } from "../src/server/payments/webhook";

test("verifica assinatura oficial do webhook Mercado Pago", () => {
  const secret = "webhook-secret-for-test";
  const dataId = "123456789";
  const requestId = "request-123";
  const timestamp = "1700000000";
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(verifyMercadoPagoSignature({ signature: `ts=${timestamp},v1=${hash}`, requestId, dataId, secret, nowSeconds: 1700000000 }), true);
  assert.equal(verifyMercadoPagoSignature({ signature: `ts=${timestamp},v1=${hash}`, requestId: "other", dataId, secret, nowSeconds: 1700000000 }), false);
});

test("rejeita assinatura expirada ou malformada", () => {
  assert.equal(verifyMercadoPagoSignature({ signature: "ts=1,v1=bad", requestId: "request", dataId: "1", secret: "secret", nowSeconds: 1000 }), false);
});
