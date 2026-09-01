import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus } from "@/generated/prisma/enums";
import { requirePermission } from "@/server/auth/auth.service";
import { listAdminOrders } from "@/server/orders/access";

const querySchema = z.object({
  status: z.enum(Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: Request) {
  try {
    await requirePermission(request, "admin:read");
    const url = new URL(request.url);
    const query = querySchema.parse({ status: url.searchParams.get("status") ?? undefined, limit: url.searchParams.get("limit") ?? undefined });
    const orders = await listAdminOrders(query);
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "AUTH_NOT_CONFIGURED") return NextResponse.json({ error: "A administração ficará disponível quando o banco estiver conectado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (message === "UNAUTHENTICATED") return NextResponse.json({ error: "Faça login para acessar a administração." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    if (message === "FORBIDDEN") return NextResponse.json({ error: "Você não tem permissão para acessar essa área." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Filtro de pedidos inválido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    console.error("admin orders failed", message || "unknown error");
    return NextResponse.json({ error: "Não foi possível consultar os pedidos." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
