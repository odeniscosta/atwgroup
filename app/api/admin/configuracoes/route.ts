import { z } from "zod";
import { requirePermission } from "@/server/auth/auth.service";
import { getMercadoPagoSettingsForDisplay, saveMercadoPagoSettings } from "@/server/payments/payment-settings";
import { routeError } from "@/server/http/route-error";

export const dynamic = "force-dynamic";

const credential = z.string().trim().min(1).max(512);
const settingsSchema = z.object({
  accessToken: credential.optional(),
  publicKey: credential.optional(),
  webhookSecret: credential.optional(),
}).strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "admin:write");
    return Response.json(
      { configuracao: await getMercadoPagoSettingsForDisplay() },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (error) {
    return routeError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requirePermission(request, "admin:write");
    const input = settingsSchema.parse(await request.json().catch(() => null));
    if (!input.accessToken && !input.publicKey && !input.webhookSecret) throw new Error("PAYMENT_SETTINGS_EMPTY");
    await saveMercadoPagoSettings(input, user.id);
    return Response.json(
      { ok: true, configuracao: await getMercadoPagoSettingsForDisplay() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_SETTINGS_EMPTY") return Response.json({ error: "Informe ao menos uma credencial para salvar." }, { status: 400 });
    return routeError(error);
  }
}
