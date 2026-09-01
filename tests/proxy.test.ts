import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { config, proxy } from "../proxy";

test("checkout compatibility proxy rewrites only the legacy POST endpoint", async () => {
  const request = new NextRequest("https://atw.test/api/orders", { method: "POST" });
  const response = proxy(request);
  assert.equal(isRewrite(response), true);
  assert.equal(getRewrittenUrl(response), "https://atw.test/api/checkout");
  assert.deepEqual(config.matcher, "/api/orders");
});

test("checkout compatibility proxy leaves non-POST requests untouched", () => {
  const request = new NextRequest("https://atw.test/api/orders", { method: "GET" });
  assert.equal(isRewrite(proxy(request)), false);
});
