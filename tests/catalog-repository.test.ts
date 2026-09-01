import assert from "node:assert/strict";
import { test } from "node:test";
import { listCatalogProducts } from "../src/modules/catalog/catalog.repository";

test("catalog repository uses the demo source when persistence is not configured", async () => {
  const result = await listCatalogProducts({ search: "eletronicos", limit: 10 });
  assert.equal(result.source, "demo");
  assert.equal(result.products.length, 2);
  assert.equal(result.products.every((product) => !("sellerId" in product)), true);
});

test("catalog repository applies demo filters consistently", async () => {
  const result = await listCatalogProducts({ categorySlug: "casa", promotionsOnly: true });
  assert.equal(result.source, "demo");
  assert.equal(result.products.length, 2);
  assert.equal(result.products.every((product) => product.category === "Casa" && product.oldPrice), true);
});
