import { z } from "zod";
import type { PublicUser } from "@/server/auth/auth.service";
import { db } from "@/lib/db";

const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use um slug em minúsculas, com hífens."),
  description: z.string().trim().max(1_000).optional().default(""),
  imageUrl: z.preprocess((value) => value === "" ? undefined : value, z.string().url().max(2_000).refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.").optional()),
  parentId: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(80).optional().nullable()),
});

function canRead(user: PublicUser) { return user.role === "ADMIN" || user.role === "MANAGER" || user.role === "SELLER"; }
function canWrite(user: PublicUser) { return user.role === "ADMIN" || user.role === "MANAGER"; }
function assertRead(user: PublicUser) { if (!canRead(user)) throw new Error("FORBIDDEN"); }
function assertWrite(user: PublicUser) { if (!canWrite(user)) throw new Error("FORBIDDEN"); }

export async function listManagedCategories(user: PublicUser) {
  assertRead(user);
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { parent: { select: { id: true, name: true } }, _count: { select: { products: true, children: true } } },
  });
}

export async function createManagedCategory(user: PublicUser, input: unknown) {
  assertWrite(user);
  const data = categoryInputSchema.parse(input);
  try {
    const category = await db.$transaction(async (transaction) => {
      if (data.parentId && !(await transaction.category.findUnique({ where: { id: data.parentId }, select: { id: true } }))) throw new Error("CATEGORY_NOT_FOUND");
      const created = await transaction.category.create({ data: { name: data.name, slug: data.slug, description: data.description || null, imageUrl: data.imageUrl, parentId: data.parentId || null } });
      await transaction.auditLog.create({ data: { userId: user.id, action: "CREATE", entity: "Category", entityId: created.id, afterData: { name: created.name, slug: created.slug } } });
      return created;
    });
    return category;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("CATEGORY_CONFLICT");
    throw error;
  }
}

export async function updateManagedCategory(user: PublicUser, id: string, input: unknown) {
  assertWrite(user);
  const data = categoryInputSchema.parse(input);
  if (data.parentId === id) throw new Error("CONFLICT");
  const before = await db.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true, parentId: true } });
  if (!before) throw new Error("CATEGORY_NOT_FOUND");
  if (before.slug === "rifas" && (data.name !== "Rifas" || data.slug !== "rifas")) throw new Error("RAFFLE_CATEGORY_PROTECTED");
  try {
    const category = await db.$transaction(async (transaction) => {
      if (data.parentId && !(await transaction.category.findUnique({ where: { id: data.parentId }, select: { id: true } }))) throw new Error("CATEGORY_NOT_FOUND");
      const updated = await transaction.category.update({ where: { id }, data: { name: data.name, slug: data.slug, description: data.description || null, imageUrl: data.imageUrl, parentId: data.parentId || null } });
      await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Category", entityId: id, beforeData: before, afterData: { name: updated.name, slug: updated.slug, parentId: updated.parentId } } });
      return updated;
    });
    return category;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("CATEGORY_CONFLICT");
    throw error;
  }
}

export async function deleteManagedCategory(user: PublicUser, id: string) {
  assertWrite(user);
  const category = await db.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true, _count: { select: { products: true, children: true } } } });
  if (!category) throw new Error("CATEGORY_NOT_FOUND");
  if (category.slug === "rifas") throw new Error("RAFFLE_CATEGORY_PROTECTED");
  if (category._count.products || category._count.children) throw new Error("CONFLICT");
  await db.$transaction(async (transaction) => {
    await transaction.category.delete({ where: { id } });
    await transaction.auditLog.create({ data: { userId: user.id, action: "DELETE", entity: "Category", entityId: id, beforeData: { name: category.name } } });
  });
}
