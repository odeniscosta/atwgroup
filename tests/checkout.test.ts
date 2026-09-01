import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDemoCheckout, parseCheckoutInput } from "../src/server/orders/checkout";

const validInput = {
  name: "Cliente ATW",
  email: "cliente@example.com",
  phone: "11999999999",
  address: "Rua das Flores, 10, São Paulo - SP",
  paymentMethod: "pix" as const,
  items: [{ id: "p-001", quantity: 1 }, { id: "p-002", quantity: 2 }],
};

test("checkout recalculates demo prices and shipping from trusted catalog data", () => {
  const result = calculateDemoCheckout(parseCheckoutInput(validInput));
  assert.equal(result.source, "demo");
  assert.equal(result.subtotal, 299.7);
  assert.equal(result.shipping, 0);
  assert.equal(result.total, 299.7);
  assert.equal(result.itemCount, 3);
});

test("checkout rejects duplicated product ids", () => {
  assert.throws(() => parseCheckoutInput({ ...validInput, items: [{ id: "p-001", quantity: 1 }, { id: "p-001", quantity: 2 }] }));
});

test("checkout rejects client-controlled price fields by schema", () => {
  const parsed = parseCheckoutInput({ ...validInput, items: [{ id: "p-001", quantity: 1, price: 0 }] });
  assert.deepEqual(parsed.items, [{ id: "p-001", quantity: 1 }]);
});
