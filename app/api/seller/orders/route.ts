import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/auth.service";
import { listSellerOrders } from "@/server/orders/access";

export async function GET(request: Request) {
  try {
    const user = await requirePermission(request, "orders:read");
    const orders = await listSellerOrders(user.id);
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "AUTH_NOT_CONFIGURED") return NextResponse.json({ error: "A área de pedidos ficará disponível quando o banco estiver conectado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Faça login para consultar os pedidos da loja." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Você não tem permissão para consultar esses pedidos." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    console.error("seller orders failed", message || "unknown error");
    return NextResponse.json({ error: "Não foi possível consultar os pedidos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
