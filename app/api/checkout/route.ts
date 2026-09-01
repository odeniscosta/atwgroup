import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth/auth.service";
import { createCheckoutOrder, parseCheckoutInput } from "@/server/orders/checkout";

export async function POST(request: Request) {
  try {
    const input = parseCheckoutInput(await request.json());
    let userId: string | undefined;
    try {
      userId = (await getUserFromRequest(request))?.id;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "AUTH_NOT_CONFIGURED") throw error;
    }
    const result = await createCheckoutOrder(input, { userId });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o pedido.";
    const status = message.includes("não está mais disponível") ? 409 : 400;
    console.error("checkout failed", message);
    return NextResponse.json({ error: status === 409 ? message : "Revise os dados informados." }, { status });
  }
}
