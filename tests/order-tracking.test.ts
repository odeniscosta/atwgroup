import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTrackingReferences, parseTrackingInput } from "../src/server/orders/tracking";

test("tracking normalizes and deduplicates multiple order references", () => {
  assert.deepEqual(normalizeTrackingReferences("atw123, ATW456; atw123"), ["ATW123", "ATW456"]);
});

test("tracking input keeps only the normalized reference list and email", () => {
  const result = parseTrackingInput({ number: "atw123 atw456", email: "Customer@Example.com" });
  assert.deepEqual(result, { number: "ATW123,ATW456", email: "Customer@Example.com" });
});

test("tracking rejects invalid email and empty references", () => {
  assert.throws(() => parseTrackingInput({ number: "", email: "customer@example.com" }));
  assert.throws(() => parseTrackingInput({ number: "ATW123", email: "invalid" }));
});
