import nodemailer from "nodemailer";
import { getNotificationSettings } from "@/server/notifications/notification-settings";

const timeoutMs = 10_000;

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

/** Envia e-mail com a configuração do painel, sem expor credenciais ao chamador. */
export async function sendConfiguredEmail(message: EmailMessage) {
  const settings = await getNotificationSettings();
  if (!settings.smtp.host || !settings.smtp.user || !settings.smtp.password) return { delivered: false as const, reason: "not_configured" as const };

  const transport = nodemailer.createTransport({
    host: settings.smtp.host,
    port: settings.smtp.port,
    secure: settings.smtp.secure,
    auth: { user: settings.smtp.user, pass: settings.smtp.password },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
  });
  try {
    await transport.sendMail({
      from: settings.smtp.from ?? settings.smtp.user,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivered: true as const };
  } catch {
    return { delivered: false as const, reason: "send_failed" as const };
  } finally {
    transport.close();
  }
}
