import { requirePermission } from "@/server/auth/auth.service";
import {
  getNotificationSettings,
  markSmtpSettingsValidated,
  testSmtpConnection,
} from "@/server/notifications/notification-settings";
import { routeError } from "@/server/http/route-error";

export async function POST(request: Request) {
  try {
    const user = await requirePermission(request, "admin:write");
    const result = await testSmtpConnection(await getNotificationSettings());
    if (result.ok) await markSmtpSettingsValidated(user.id);
    return Response.json(result, { status: result.ok ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
