import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { db } from "@/lib/db";

const SETTING_KEYS = {
  accessToken: "payments.mercadopago.access_token",
  publicKey: "payments.mercadopago.public_key",
  webhookSecret: "payments.mercadopago.webhook_secret",
  validated: "payments.mercadopago.validated",
} as const;

const encryptedPrefix = "v1";
const environmentPlaceholders = new Set(["replace-with-mercado-pago-access-token", "replace-with-a-long-random-secret"]);

export type MercadoPagoSettings = {
  accessToken: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
};

export type MercadoPagoSettingsInput = Partial<MercadoPagoSettings>;

function encryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32 || environmentPlaceholders.has(secret)) throw new Error("AUTH_NOT_CONFIGURED");
  return scryptSync(secret, "atwgroup-mercadopago-settings", 32);
}

/** AES-256-GCM com IV aleatório; o conteúdo cifrado nunca deve ir para o cliente. */
export function encryptMercadoPagoSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${encryptedPrefix}:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptMercadoPagoSecret(value: string) {
  const [prefix, ivEncoded, tagEncoded, encryptedEncoded] = value.split(":");
  if (prefix !== encryptedPrefix || !ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error("PAYMENT_SETTINGS_INVALID");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("PAYMENT_SETTINGS_INVALID");
  }
}

export function maskMercadoPagoSecret(value: string) {
  return value.length <= 4 ? "••••" : `••••••••${value.slice(-4)}`;
}

function environmentValue(name: string) {
  const value = process.env[name]?.trim();
  return value && !environmentPlaceholders.has(value) ? value : null;
}

function storedSecret(value: unknown) {
  if (!value || typeof value !== "object" || !("encrypted" in value)) return null;
  const encrypted = (value as { encrypted?: unknown }).encrypted;
  if (typeof encrypted !== "string") throw new Error("PAYMENT_SETTINGS_INVALID");
  return decryptMercadoPagoSecret(encrypted);
}

async function readSettings() {
  const rows = await db.setting.findMany({
    where: { key: { in: Object.values(SETTING_KEYS) } },
    select: { key: true, value: true },
  });
  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function getMercadoPagoSettings(): Promise<MercadoPagoSettings> {
  const rows = await readSettings();
  return {
    accessToken: storedSecret(rows.get(SETTING_KEYS.accessToken)) ?? environmentValue("MERCADOPAGO_ACCESS_TOKEN"),
    publicKey: storedSecret(rows.get(SETTING_KEYS.publicKey)) ?? environmentValue("MERCADOPAGO_PUBLIC_KEY"),
    webhookSecret: storedSecret(rows.get(SETTING_KEYS.webhookSecret)) ?? environmentValue("MERCADOPAGO_WEBHOOK_SECRET"),
  };
}

export async function saveMercadoPagoSettings(input: MercadoPagoSettingsInput, actorId: string) {
  const changes = {
    accessToken: Boolean(input.accessToken),
    publicKey: Boolean(input.publicKey),
    webhookSecret: Boolean(input.webhookSecret),
  };

  await db.$transaction(async (transaction) => {
    const updates: Array<[string, string | undefined]> = [
      [SETTING_KEYS.accessToken, input.accessToken ?? undefined],
      [SETTING_KEYS.publicKey, input.publicKey ?? undefined],
      [SETTING_KEYS.webhookSecret, input.webhookSecret ?? undefined],
    ];
    for (const [key, value] of updates) {
      if (!value) continue;
      await transaction.setting.upsert({
        where: { key },
        update: { value: { encrypted: encryptMercadoPagoSecret(value) } },
        create: { key, value: { encrypted: encryptMercadoPagoSecret(value) } },
      });
    }
    await transaction.setting.upsert({
      where: { key: SETTING_KEYS.validated },
      update: { value: false },
      create: { key: SETTING_KEYS.validated, value: false },
    });
    await transaction.auditLog.create({
      data: {
        userId: actorId,
        action: "UPDATE_PAYMENT_SETTINGS",
        entity: "Setting",
        entityId: "mercadopago",
        afterData: { ...changes, source: "admin-panel" },
      },
    });
  });
}

export async function markMercadoPagoSettingsValidated(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.upsert({
      where: { key: SETTING_KEYS.validated },
      update: { value: true },
      create: { key: SETTING_KEYS.validated, value: true },
    });
    await transaction.auditLog.create({
      data: {
        userId: actorId,
        action: "VALIDATE_PAYMENT_SETTINGS",
        entity: "Setting",
        entityId: "mercadopago",
        afterData: { provider: "mercadopago" },
      },
    });
  });
}

export async function clearMercadoPagoSettings(actorId: string) {
  await db.$transaction(async (transaction) => {
    await transaction.setting.deleteMany({ where: { key: { in: Object.values(SETTING_KEYS) } } });
    await transaction.auditLog.create({
      data: {
        userId: actorId,
        action: "CLEAR_PAYMENT_SETTINGS",
        entity: "Setting",
        entityId: "mercadopago",
        afterData: { provider: "mercadopago", cleared: true },
      },
    });
  });
}

export async function getMercadoPagoSettingsForDisplay() {
  const [settings, rows] = await Promise.all([getMercadoPagoSettings(), readSettings()]);
  const validated = rows.get(SETTING_KEYS.validated);
  return {
    mpAccessToken: settings.accessToken ? maskMercadoPagoSecret(settings.accessToken) : null,
    mpPublicKey: settings.publicKey ? maskMercadoPagoSecret(settings.publicKey) : null,
    mpWebhookSecret: settings.webhookSecret ? maskMercadoPagoSecret(settings.webhookSecret) : null,
    mpPreenchido: Boolean(settings.accessToken && settings.publicKey && settings.webhookSecret),
    mpValidado: validated === true,
  };
}

export async function testMercadoPagoAccessToken(accessToken: string, fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return { ok: false, erro: `Mercado Pago recusou o token (HTTP ${response.status}). Confira se copiou certo.` };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Erro de conexão ao validar o token com o Mercado Pago." };
  }
}
