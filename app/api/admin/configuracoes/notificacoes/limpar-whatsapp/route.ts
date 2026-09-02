import { requirePermission } from "@/server/auth/auth.service";
import { clearWhatsAppSettings, getNotificationSettingsForDisplay } from "@/server/notifications/notification-settings";
import { routeError } from "@/server/http/route-error";

export async function POST(request: Request) {
  try {
    const user = await requirePermission(request, "admin:write");
    await clearWhatsAppSettings(user.id);
    return Response.json({ ok: true, configuracao: await getNotificationSettingsForDisplay() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
