import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { Role } from "@/server/auth/rbac";

const sessionCookie = "atw_session";
const sessionLifetimeSeconds = 60 * 60 * 24 * 30;
const passwordVersion = "scrypt-v1";
const scryptOptions = { N: 16_384, r: 8, p: 1 };

export type SessionPayload = {
  userId: string;
  role: Role;
  exp: number;
};

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32 || value === "replace-with-a-long-random-secret") throw new Error("AUTH_NOT_CONFIGURED");
  return value;
}

function deriveKey(password: string, salt: string, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, scryptOptions, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await deriveKey(password, salt, 64);
  return `${passwordVersion}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [version, salt, encodedHash] = storedHash.split("$");
  if (version !== passwordVersion || !salt || !encodedHash) return false;
  const expected = Buffer.from(encodedHash, "base64url");
  const actual = await deriveKey(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSessionToken(user: { id: string; role: Role }) {
  const payload: SessionPayload = { userId: user.id, role: user.role, exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  try {
    const [encodedPayload, encodedSignature] = token.split(".");
    if (!encodedPayload || !encodedSignature) return null;
    const expectedSignature = Buffer.from(sign(encodedPayload));
    const receivedSignature = Buffer.from(encodedSignature);
    if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) return null;
    const payload = JSON.parse(decode(encodedPayload)) as Partial<SessionPayload>;
    if (typeof payload.userId !== "string" || typeof payload.role !== "string" || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function readCookieHeader(cookieHeader: string | null) {
  const token = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  return readSessionToken(token);
}

export function setSessionCookie(response: Response, user: { id: string; role: Role }) {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secure}`);
  return response;
}

export function clearSessionCookie(response: Response) {
  response.headers.append("Set-Cookie", `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}

export { sessionCookie };
