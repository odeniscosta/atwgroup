import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth/auth.service";
import { listCustomerOrders } from "@/server/orders/access";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Faça login para consultar seus pedidos." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    const orders = await listCustomerOrders(user.id);
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") {
      return NextResponse.json({ error: "A conta ficará disponível quando o banco estiver conectado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    console.error("customer orders failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Não foi possível consultar os pedidos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
