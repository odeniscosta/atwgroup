import { z } from "zod";
import { requirePermission } from "@/server/auth/auth.service";
import { getMercadoPagoSettings, markMercadoPagoSettingsValidated, testMercadoPagoAccessToken } from "@/server/payments/payment-settings";
import { routeError } from "@/server/http/route-error";

const schema = z.object({ accessToken: z.string().trim().min(1).max(512).optional() }).strict();

export async function POST(request: Request) {
  try {
    const user = await requirePermission(request, "admin:write");
    const input = schema.parse(await request.json().catch(() => ({})));
    const accessToken = input.accessToken ?? (await getMercadoPagoSettings()).accessToken;
    if (!accessToken) return Response.json({ ok: false, erro: "Nenhum Access Token informado ou salvo." }, { status: 400 });
    const result = await testMercadoPagoAccessToken(accessToken);
    if (result.ok && !input.accessToken) await markMercadoPagoSettingsValidated(user.id);
    return Response.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
