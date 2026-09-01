import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

function readBoolean(value: string | null) {
  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 24);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 24;
  const result = await listCatalogProducts({
    categorySlug: url.searchParams.get("category")?.trim().slice(0, 80) || undefined,
    storeSlug: url.searchParams.get("store")?.trim().slice(0, 80) || undefined,
    search: url.searchParams.get("q")?.trim().slice(0, 80) || undefined,
    promotionsOnly: readBoolean(url.searchParams.get("offers")),
    limit,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
