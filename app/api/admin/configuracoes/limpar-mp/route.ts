import { requirePermission } from "@/server/auth/auth.service";
import { clearMercadoPagoSettings, getMercadoPagoSettingsForDisplay } from "@/server/payments/payment-settings";
import { routeError } from "@/server/http/route-error";

export async function POST(request: Request) {
  try {
    const user = await requirePermission(request, "admin:write");
    await clearMercadoPagoSettings(user.id);
    return Response.json(
      { ok: true, configuracao: await getMercadoPagoSettingsForDisplay() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError(error);
  }
}
