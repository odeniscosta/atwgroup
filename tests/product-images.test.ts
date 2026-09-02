import assert from "node:assert/strict";
import { test } from "node:test";
import { hasValidImageSignature, isAllowedImageType, MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES } from "../src/server/admin/product-images";

test("product image policy accepts only the supported formats and limits", () => {
  assert.equal(MAX_PRODUCT_IMAGES, 5);
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024);
  assert.equal(isAllowedImageType("image/jpeg"), true);
  assert.equal(isAllowedImageType("image/png"), true);
  assert.equal(isAllowedImageType("image/webp"), true);
  assert.equal(isAllowedImageType("image/avif"), true);
  assert.equal(isAllowedImageType("image/svg+xml"), false);
  assert.equal(isAllowedImageType("application/javascript"), false);
});
test("product image policy checks file signatures instead of trusting MIME alone", () => {
  assert.equal(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
  assert.equal(hasValidImageSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(hasValidImageSignature(new TextEncoder().encode("RIFFxxxxWEBP"), "image/webp"), true);
  assert.equal(hasValidImageSignature(new TextEncoder().encode("xxxxftypavif"), "image/avif"), true);
  assert.equal(hasValidImageSignature(new TextEncoder().encode("not-an-image"), "image/png"), false);
});
