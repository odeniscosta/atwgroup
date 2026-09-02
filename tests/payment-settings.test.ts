import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptMercadoPagoSecret, encryptMercadoPagoSecret, maskMercadoPagoSecret, testMercadoPagoAccessToken } from "../src/server/payments/payment-settings";

test("Mercado Pago secrets are encrypted and can be recovered only with the session secret", () => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "a".repeat(32);
  const secret = "APP_USR-private-token-for-test";
  const encrypted = encryptMercadoPagoSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptMercadoPagoSecret(encrypted), secret);
  assert.equal(maskMercadoPagoSecret(secret), "••••••••test");
  process.env.NEXTAUTH_SECRET = previous;
});
test("Mercado Pago credential validation never exposes the token", async () => {
  let authorization = "";
  const result = await testMercadoPagoAccessToken("APP_USR-secret-token", async (_url, init) => {
    authorization = new Headers(init?.headers).get("Authorization") ?? "";
    return new Response("{}", { status: 200 });
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(authorization, "Bearer APP_USR-secret-token");
});
