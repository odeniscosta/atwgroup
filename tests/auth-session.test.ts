import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionToken, readSessionToken, verifyPassword, hashPassword } from "../src/server/auth/session";

test("password hashing verifies the correct password only", async () => {
  const hash = await hashPassword("SenhaSegura123");
  assert.equal(await verifyPassword("SenhaSegura123", hash), true);
  assert.equal(await verifyPassword("SenhaErrada123", hash), false);
  assert.notEqual(hash, "SenhaSegura123");
});

test("session token is signed and rejects tampering", () => {
  const previous = process.env.NEXTAUTH_SECRET;
  process.env.NEXTAUTH_SECRET = "a".repeat(32);
  const token = createSessionToken({ id: "user-1", role: "CUSTOMER" });
  assert.deepEqual(readSessionToken(token)?.userId, "user-1");
  assert.equal(readSessionToken(`${token}x`), null);
  process.env.NEXTAUTH_SECRET = previous;
});
