import { z } from "zod";
import { requirePermission } from "@/server/auth/auth.service";
import {
  getNotificationSettingsForDisplay,
  saveSmtpSettings,
  saveWhatsAppSettings,
} from "@/server/notifications/notification-settings";
import { routeError } from "@/server/http/route-error";

export const dynamic = "force-dynamic";

const text = z.string().trim().min(1).max(512);
const smtpSchema = z.object({
  host: text.optional(),
  port: z.coerce.number().int().min(1).max(65_535).optional(),
  user: text.optional(),
  password: text.optional(),
  from: text.optional(),
  secure: z.boolean().optional(),
}).strict();
const whatsappSchema = z.object({
  apiUrl: text.optional(),
  apiKey: text.optional(),
  instance: z.string().trim().min(2).max(80).regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, - e _").optional(),
  adminPhone: z.string().trim().min(10).max(20).optional(),
  enabled: z.boolean().optional(),
}).strict();
const settingsSchema = z.object({ smtp: smtpSchema.optional(), whatsapp: whatsappSchema.optional() }).strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "admin:write");
    return Response.json(
      { configuracao: await getNotificationSettingsForDisplay() },
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
    const smtpHasValues = Boolean(input.smtp && Object.keys(input.smtp).length > 0);
    const whatsappHasValues = Boolean(input.whatsapp && Object.keys(input.whatsapp).length > 0);
    if (!smtpHasValues && !whatsappHasValues) throw new Error("NOTIFICATION_SETTINGS_EMPTY");
    if (input.smtp && smtpHasValues) await saveSmtpSettings(input.smtp, user.id);
    if (input.whatsapp && whatsappHasValues) await saveWhatsAppSettings(input.whatsapp, user.id);
    return Response.json(
      { ok: true, configuracao: await getNotificationSettingsForDisplay() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "NOTIFICATION_SETTINGS_EMPTY") return Response.json({ error: "Informe ao menos um campo de SMTP ou WhatsApp para salvar." }, { status: 400 });
    if (error instanceof Error && error.message === "WHATSAPP_NUMBER_INVALID") return Response.json({ error: "Informe um número de WhatsApp válido com DDD." }, { status: 400 });
    return routeError(error);
  }
}
