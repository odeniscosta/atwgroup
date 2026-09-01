import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrderPayment, paymentInputSchema } from "@/server/payments/payment.service";

export async function POST(request: Request) {
  try {
    const input = paymentInputSchema.parse(await request.json());
    const result = await createOrderPayment(request, input);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados de pagamento inválidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    if (message === "PAYMENT_DATABASE_UNAVAILABLE") return NextResponse.json({ error: "O pagamento real ficará disponível quando o banco estiver conectado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (message === "PAYMENT_NOT_CONFIGURED") return NextResponse.json({ error: "O provedor de pagamento ainda não foi configurado." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    if (message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    if (message === "ORDER_FORBIDDEN") return NextResponse.json({ error: "Você não pode pagar este pedido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    if (message === "PAYMENT_ALREADY_APPROVED") return NextResponse.json({ error: "Este pedido já está pago." }, { status: 409, headers: { "Cache-Control": "no-store" } });
    if (message === "PAYMENT_INPUT_INCOMPLETE") return NextResponse.json({ error: "Os dados do cartão são obrigatórios." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    console.error("payment creation failed", message || "unknown error");
    return NextResponse.json({ error: "Não foi possível processar o pagamento." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
