import { z } from "zod";
import { requirePermission } from "@/server/auth/auth.service";
import { sendWhatsAppTestMessage } from "@/server/notifications/notification-settings";
import { routeError } from "@/server/http/route-error";

const schema = z.object({ number: z.string().trim().min(10).max(20) }).strict();

export async function POST(request: Request) {
  try {
    await requirePermission(request, "admin:write");
    const input = schema.parse(await request.json().catch(() => null));
    const result = await sendWhatsAppTestMessage(input.number);
    return Response.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "WHATSAPP_NUMBER_INVALID") return Response.json({ error: "Informe um número de WhatsApp válido com DDD." }, { status: 400 });
    return routeError(error);
  }
}
