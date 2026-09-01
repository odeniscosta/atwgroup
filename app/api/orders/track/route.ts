import { NextResponse } from "next/server";
import { findTrackedOrders, parseTrackingInput } from "@/server/orders/tracking";

export async function POST(request: Request) {
  try {
    const input = parseTrackingInput(await request.json());
    const result = await findTrackedOrders(input);
    if (!result.orders.length) return NextResponse.json({ error: "Não encontramos pedidos com esses dados." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_TRACKING_UNAVAILABLE") {
      return NextResponse.json({ error: "O acompanhamento será liberado quando o banco de pedidos estiver conectado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Informe um número de pedido e um e-mail válidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
