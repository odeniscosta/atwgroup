import assert from "node:assert/strict";
import { test } from "node:test";
import { maskNotificationSecret, normalizeWhatsAppNumber } from "../src/server/notifications/notification-settings";

test("WhatsApp number is normalized to the Evolution API format", () => {
  assert.equal(normalizeWhatsAppNumber("(11) 91234-5678"), "5511912345678");
  assert.equal(normalizeWhatsAppNumber("5511912345678"), "5511912345678");
});

test("invalid WhatsApp number is rejected before any external request", () => {
  assert.throws(() => normalizeWhatsAppNumber("123"), /WHATSAPP_NUMBER_INVALID/);
});

test("notification secrets are displayed only in masked form", () => {
  assert.equal(maskNotificationSecret("api-key-test"), "••••••••test");
  assert.equal(maskNotificationSecret("1234"), "••••");
});
