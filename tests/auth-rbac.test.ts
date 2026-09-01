import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "@/server/auth/rbac";

test("customer permissions are limited to their own commerce actions", () => {
  assert.equal(hasPermission("CUSTOMER", "orders:read"), true);
  assert.equal(hasPermission("CUSTOMER", "admin:read"), false);
  assert.equal(hasPermission("CUSTOMER", "orders:write"), false);
});

test("seller and admin permissions are separated", () => {
  assert.equal(hasPermission("SELLER", "orders:read"), true);
  assert.equal(hasPermission("SELLER", "admin:read"), false);
  assert.equal(hasPermission("ADMIN", "admin:read"), true);
  assert.equal(hasPermission("ADMIN", "orders:write"), true);
});
