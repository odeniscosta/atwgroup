import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

const SETTING_KEYS = {
  smtpHost: "notifications.smtp.host",
  smtpPort: "notifications.smtp.port",
  smtpUser: "notifications.smtp.user",
  smtpPassword: "notifications.smtp.password",
  smtpFrom: "notifications.smtp.from",
  smtpSecure: "notifications.smtp.secure",
  smtpValidated: "notifications.smtp.validated",
  whatsappApiUrl: "notifications.whatsapp.api_url",
  whatsappApiKey: "notifications.whatsapp.api_key",
  whatsappInstance: "notifications.whatsapp.instance",
  whatsappAdminPhone: "notifications.whatsapp.admin_phone",
  whatsappEnabled: "notifications.whatsapp.enabled",
  whatsappValidated: "notifications.whatsapp.validated",
} as const;

const encryptedPrefix = "v1";
const encryptionSalt = "atwgroup-notification-settings";
const environmentPlaceholders = new Set([
  "replace-with-a-long-random-secret",
  "replace-with-mercado-pago-access-token",
  "PREENCHER_AQUI",
]);
const timeoutMs = 10_000;

export type SmtpSettings = {
  host: string | null;
  port: number;
  user: string | null;
  password: string | null;
  from: string | null;
  secure: boolean;
};

export type WhatsAppSettings = {
  apiUrl: string | null;
  apiKey: string | null;
  instance: string | null;
  adminPhone: string | null;
  enabled: boolean;
};

export type NotificationSettingsInput = {
  smtp?: Partial<SmtpSettings>;
  whatsapp?: Partial<WhatsAppSettings>;
};

function encryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32 || environmentPlaceholders.has(secret)) throw new Error("AUTH_NOT_CONFIGURED");
  return scryptSync(secret, encryptionSalt, 32);
}

/** AES-256-GCM com IV aleatório; valores cifrados nunca são enviados ao navegador. */
function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${encryptedPrefix}:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptSecret(value: string) {
  const [prefix, ivEncoded, tagEncoded, encryptedEncoded] = value.split(":");
  if (prefix !== encryptedPrefix || !ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error("NOTIFICATION_SETTINGS_INVALID");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("NOTIFICATION_SETTINGS_INVALID");
  }
}

export function maskNotificationSecret(value: string) {
  return value.length <= 4 ? "••••" : `••••••••${value.slice(-4)}`;
}

function environmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !environmentPlaceholders.has(value)) return value;
  }
  return null;
}

function environmentBoolean(name: string, fallback: boolean) {
  const value = environmentValue(name)?.toLowerCase();
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

function storedSecret(value: unknown) {
  if (!value || typeof value !== "object" || !("encrypted" in value)) return null;
  const encrypted = (value as { encrypted?: unknown }).encrypted;
  if (typeof encrypted !== "string") throw new Error("NOTIFICATION_SETTINGS_INVALID");
  return decryptSecret(encrypted);
}

function storedText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function storedNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 65_535) return null;
  return value;
}

function storedBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

async function readSettings() {
  const rows = await db.setting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  return new Map(rows.map((row) => [row.key, row.value]));
}

function environmentPort() {
  const value = Number(environmentValue("SMTP_PORT"));
  return Number.isInteger(value) && value >= 1 && value <= 65_535 ? value : 465;
}

function environmentSecure(port: number) {
  const value = environmentValue("SMTP_SECURE");
  if (!value) return port === 465;
  return value.toLowerCase() !== "false";
}

function normalizeApiUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("NOTIFICATION_SETTINGS_INVALID");
  }
  if (!(["http:", "https:"].includes(parsed.protocol)) || parsed.username || parsed.password || parsed.hash) {
    throw new Error("NOTIFICATION_SETTINGS_INVALID");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("WHATSAPP_NUMBER_INVALID");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function getNotificationSettings(): Promise<{ smtp: SmtpSettings; whatsapp: WhatsAppSettings }> {
  const rows = await readSettings();
  const smtpPort = storedNumber(rows.get(SETTING_KEYS.smtpPort)) ?? environmentPort();
  const storedApiUrl = storedText(rows.get(SETTING_KEYS.whatsappApiUrl));
  const apiUrl = storedApiUrl ?? environmentValue("EVOLUTION_API_URL", "EVOLUTION_URL");
  return {
    smtp: {
      host: storedText(rows.get(SETTING_KEYS.smtpHost)) ?? environmentValue("SMTP_HOST"),
      port: smtpPort,
      user: storedText(rows.get(SETTING_KEYS.smtpUser)) ?? environmentValue("SMTP_USER"),
      password: storedSecret(rows.get(SETTING_KEYS.smtpPassword)) ?? environmentValue("SMTP_PASS"),
      from: storedText(rows.get(SETTING_KEYS.smtpFrom)) ?? environmentValue("SMTP_FROM", "EMAIL_FROM"),
      secure: storedBoolean(rows.get(SETTING_KEYS.smtpSecure)) ?? environmentSecure(smtpPort),
    },
    whatsapp: {
      apiUrl: apiUrl ? normalizeApiUrl(apiUrl) : null,
      apiKey: storedSecret(rows.get(SETTING_KEYS.whatsappApiKey)) ?? environmentValue("EVOLUTION_API_KEY", "EVOLUTION_APIKEY"),
      instance: storedText(rows.get(SETTING_KEYS.whatsappInstance)) ?? environmentValue("EVOLUTION_INSTANCE"),
      adminPhone: storedText(rows.get(SETTING_KEYS.whatsappAdminPhone)) ?? environmentValue("WHATSAPP_ADMIN_PHONE", "ADMIN_WHATSAPP"),
      enabled: storedBoolean(rows.get(SETTING_KEYS.whatsappEnabled)) ?? environmentBoolean("WHATSAPP_NOTIFICATIONS_ENABLED", true),
    },
  };
}

export async function getNotificationSettingsForDisplay() {
  const [settings, rows] = await Promise.all([getNotificationSettings(), readSettings()]);
  const smtpReady = Boolean(settings.smtp.host && settings.smtp.user && settings.smtp.password);
  const whatsappReady = Boolean(settings.whatsapp.apiUrl && settings.whatsapp.apiKey && settings.whatsapp.instance);
  return {
    smtp: {
      host: settings.smtp.host,
      port: settings.smtp.port,
      user: settings.smtp.user,
      password: settings.smtp.password ? maskNotificationSecret(settings.smtp.password) : null,
      from: settings.smtp.from,
      secure: settings.smtp.secure,
      preenchido: smtpReady,
      validado: storedBoolean(rows.get(SETTING_KEYS.smtpValidated)) ?? false,
    },
    whatsapp: {
      apiUrl: settings.whatsapp.apiUrl,
      apiKey: settings.whatsapp.apiKey ? maskNotificationSecret(settings.whatsapp.apiKey) : null,
      instance: settings.whatsapp.instance,
      adminPhone: settings.whatsapp.adminPhone,
      enabled: settings.whatsapp.enabled,
      preenchido: whatsappReady,
      prontoParaNotificar: whatsappReady && Boolean(settings.whatsapp.adminPhone) && settings.whatsapp.enabled,
      validado: storedBoolean(rows.get(SETTING_KEYS.whatsappValidated)) ?? false,
    },
  };
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0);
}

export async function saveSmtpSettings(input: Partial<SmtpSettings>, actorId: string) {
  const changes = { host: hasValue(input.host), port: hasValue(input.port), user: hasValue(input.user), password: hasValue(input.password), from: hasValue(input.from), secure: input.secure !== undefined };
  await db.$transaction(async (transaction) => {
    const updates: Array<[string, unknown]> = [
      [SETTING_KEYS.smtpHost, input.host],
      [SETTING_KEYS.smtpPort, input.port],
      [SETTING_KEYS.smtpUser, input.user],
      [SETTING_KEYS.smtpPassword, input.password ? { encrypted: encryptSecret(input.password) } : undefined],
      [SETTING_KEYS.smtpFrom, input.from],
      [SETTING_KEYS.smtpSecure, input.secure],
    ];
    for (const [key, value] of updates) {
      if (!hasValue(value)) continue;
      await transaction.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });
    }
    await transaction.setting.upsert({ where: { key: SETTING_KEYS.smtpValidated }, update: { value: false }, create: { key: SETTING_KEYS.smtpValidated, value: false } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "UPDATE_SMTP_SETTINGS", entity: "Setting", entityId: "smtp", afterData: { ...changes, source: "admin-panel" } } });
  });
}

export async function saveWhatsAppSettings(input: Partial<WhatsAppSettings>, actorId: string) {
  const changes = { apiUrl: hasValue(input.apiUrl), apiKey: hasValue(input.apiKey), instance: hasValue(input.instance), adminPhone: hasValue(input.adminPhone), enabled: input.enabled !== undefined };
  if (input.apiUrl) normalizeApiUrl(input.apiUrl);
  if (input.adminPhone) normalizeWhatsAppNumber(input.adminPhone);
  await db.$transaction(async (transaction) => {
    const updates: Array<[string, unknown]> = [
      [SETTING_KEYS.whatsappApiUrl, input.apiUrl ? normalizeApiUrl(input.apiUrl) : undefined],
      [SETTING_KEYS.whatsappApiKey, input.apiKey ? { encrypted: encryptSecret(input.apiKey) } : undefined],
      [SETTING_KEYS.whatsappInstance, input.instance],
      [SETTING_KEYS.whatsappAdminPhone, input.adminPhone],
      [SETTING_KEYS.whatsappEnabled, input.enabled],
    ];
    for (const [key, value] of updates) {
      if (!hasValue(value)) continue;
      await transaction.setting.upsert({ where: { key }, update: { value: value as never }, create: { key, value: value as never } });
    }
    await transaction.setting.upsert({ where: { key: SETTING_KEYS.whatsappValidated }, update: { value: false }, create: { key: SETTING_KEYS.whatsappValidated, value: false } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "UPDATE_WHATSAPP_SETTINGS", entity: "Setting", entityId: "whatsapp", afterData: { ...changes, source: "admin-panel" } } });
  });
}

export async function markSmtpSettingsValidated(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.upsert({ where: { key: SETTING_KEYS.smtpValidated }, update: { value: true }, create: { key: SETTING_KEYS.smtpValidated, value: true } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "VALIDATE_SMTP_SETTINGS", entity: "Setting", entityId: "smtp", afterData: { provider: "smtp" } } });
  });
}

export async function markWhatsAppSettingsValidated(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.upsert({ where: { key: SETTING_KEYS.whatsappValidated }, update: { value: true }, create: { key: SETTING_KEYS.whatsappValidated, value: true } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "VALIDATE_WHATSAPP_SETTINGS", entity: "Setting", entityId: "whatsapp", afterData: { provider: "evolution-api" } } });
  });
}

export async function clearSmtpSettings(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.deleteMany({ where: { key: { in: [SETTING_KEYS.smtpHost, SETTING_KEYS.smtpPort, SETTING_KEYS.smtpUser, SETTING_KEYS.smtpPassword, SETTING_KEYS.smtpFrom, SETTING_KEYS.smtpSecure, SETTING_KEYS.smtpValidated] } } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "CLEAR_SMTP_SETTINGS", entity: "Setting", entityId: "smtp", afterData: { provider: "smtp", cleared: true } } });
  });
}

export async function clearWhatsAppSettings(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.deleteMany({ where: { key: { in: [SETTING_KEYS.whatsappApiUrl, SETTING_KEYS.whatsappApiKey, SETTING_KEYS.whatsappInstance, SETTING_KEYS.whatsappAdminPhone, SETTING_KEYS.whatsappEnabled, SETTING_KEYS.whatsappValidated] } } });
    await transaction.auditLog.create({ data: { userId: actorId, action: "CLEAR_WHATSAPP_SETTINGS", entity: "Setting", entityId: "whatsapp", afterData: { provider: "evolution-api", cleared: true } } });
  });
}

export async function testSmtpConnection(settings?: Awaited<ReturnType<typeof getNotificationSettings>>) {
  const current = settings ?? await getNotificationSettings();
  if (!current.smtp.host || !current.smtp.user || !current.smtp.password) return { ok: false, erro: "Preencha host, usuário e senha do SMTP antes de testar." };
  try {
    const transport = nodemailer.createTransport({
      host: current.smtp.host,
      port: current.smtp.port,
      secure: current.smtp.secure,
      auth: { user: current.smtp.user, pass: current.smtp.password },
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
    });
    await transport.verify();
    transport.close();
    return { ok: true } as const;
  } catch {
    return { ok: false, erro: "Não foi possível validar a conexão SMTP. Confira host, porta, segurança e credenciais." } as const;
  }
}

function evolutionUrl(settings: WhatsAppSettings, path: string) {
  if (!settings.apiUrl || !settings.apiKey || !settings.instance) return null;
  return `${settings.apiUrl}/instance/${path}/${encodeURIComponent(settings.instance)}`;
}

export async function testWhatsAppConnection(settings?: Awaited<ReturnType<typeof getNotificationSettings>>) {
  const current = settings ?? await getNotificationSettings();
  const url = evolutionUrl(current.whatsapp, "connectionState");
  if (!url) return { ok: false, erro: "Preencha URL, chave da API e nome da instância antes de testar." };
  try {
    const response = await fetch(url, { headers: { apikey: current.whatsapp.apiKey as string }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { ok: false, erro: `A Evolution API recusou a consulta (HTTP ${response.status}).` };
    const body = (await response.json().catch(() => null)) as { instance?: { state?: unknown }; state?: unknown } | null;
    const state = typeof body?.instance?.state === "string" ? body.instance.state : typeof body?.state === "string" ? body.state : "desconhecido";
    return { ok: true, estado: state } as const;
  } catch {
    return { ok: false, erro: "Não foi possível conectar à Evolution API. Confira a URL, a chave e a instância." } as const;
  }
}

export async function sendWhatsAppTestMessage(recipient: string, settings?: Awaited<ReturnType<typeof getNotificationSettings>>) {
  const current = settings ?? await getNotificationSettings();
  const number = normalizeWhatsAppNumber(recipient);
  if (!current.whatsapp.apiUrl || !current.whatsapp.apiKey || !current.whatsapp.instance) return { ok: false, erro: "Preencha e salve a configuração da Evolution API antes de enviar o teste." };
  try {
    const response = await fetch(`${current.whatsapp.apiUrl}/message/sendText/${encodeURIComponent(current.whatsapp.instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: current.whatsapp.apiKey },
      body: JSON.stringify({ number, text: "✅ Teste de WhatsApp ATW Group\n\nA integração está funcionando." }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, erro: `A Evolution API recusou o envio (HTTP ${response.status}).` };
    return { ok: true } as const;
  } catch {
    return { ok: false, erro: "Não foi possível enviar a mensagem de teste pela Evolution API." } as const;
  }
}
