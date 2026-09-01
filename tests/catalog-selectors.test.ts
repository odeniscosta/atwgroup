import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getProductsByCategory,
  getProductsByStore,
  getPromotionalProducts,
  searchProducts,
} from "../src/modules/catalog/catalog.selectors";

test("catalog selectors filter products by category and store", () => {
  assert.equal(getProductsByCategory("eletronicos").length, 2);
  assert.equal(getProductsByStore("conecta-tech").length, 2);
  assert.equal(getProductsByCategory("categoria-inexistente").length, 0);
});

test("catalog search is accent-insensitive and searches store names", () => {
  assert.equal(searchProducts("eletronicos").length, 2);
  assert.equal(searchProducts("Casa Norte")[0]?.slug, "moletom-comfy-areia");
  assert.equal(searchProducts("sem resultado").length, 0);
});

test("promotional products are ordered by the largest discount", () => {
  const products = getPromotionalProducts();
  assert.equal(products.length >= 7, true);
  assert.equal(products[0]?.slug, "fone-bluetooth-wave");
});
