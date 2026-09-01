import { z } from "zod";
import { db } from "@/lib/db";
import { hasPermission, type Role } from "@/server/auth/rbac";
import { hashPassword, readCookieHeader, readSessionToken, verifyPassword } from "@/server/auth/session";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128).regex(/[A-Za-z]/).regex(/[0-9]/),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128),
});

export type PublicUser = { id: string; name: string; email: string; role: Role };

function requireDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("AUTH_NOT_CONFIGURED");
}

function publicUser(user: { id: string; name: string; email: string; role: Role }): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registerUser(input: unknown) {
  requireDatabase();
  const data = registerSchema.parse(input);
  const email = data.email.toLocaleLowerCase("pt-BR");
  const user = await db.user.create({
    data: { name: data.name, email, passwordHash: await hashPassword(data.password), role: "CUSTOMER", customer: { create: {} } },
    select: { id: true, name: true, email: true, role: true },
  });
  return publicUser(user);
}

export async function loginUser(input: unknown) {
  requireDatabase();
  const data = loginSchema.parse(input);
  const user = await db.user.findUnique({ where: { email: data.email.toLocaleLowerCase("pt-BR") }, select: { id: true, name: true, email: true, role: true, passwordHash: true } });
  if (!user || !(await verifyPassword(data.password, user.passwordHash))) throw new Error("INVALID_CREDENTIALS");
  return publicUser(user);
}

export async function getUserFromRequest(request: Request): Promise<PublicUser | null> {
  requireDatabase();
  const session = readCookieHeader(request.headers.get("cookie"));
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true } });
  return user ? publicUser(user) : null;
}

export async function getUserFromToken(token: string | undefined): Promise<PublicUser | null> {
  requireDatabase();
  const session = readSessionToken(token);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true } });
  return user ? publicUser(user) : null;
}

export async function requirePermission(request: Request, permission: string) {
  const user = await getUserFromRequest(request);
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!hasPermission(user.role, permission)) throw new Error("FORBIDDEN");
  return user;
}
