import assert from "node:assert/strict";
import { test } from "node:test";
import { demoProducts } from "../src/modules/catalog/catalog.data";
import { discountPercent, formatCurrency } from "../src/lib/format";

test("catalog demo contains products with valid commercial data", () => {
  assert.equal(demoProducts.length >= 8, true);
  assert.equal(demoProducts.every((product) => product.price > 0 && product.image.startsWith("https://")), true);
});

test("format helpers use Brazilian currency and calculate discounts", () => {
  assert.equal(formatCurrency(1299.9), "R$\u00a01.299,90");
  assert.equal(discountPercent(75, 100), 25);
  assert.equal(discountPercent(100, 100), null);
});
