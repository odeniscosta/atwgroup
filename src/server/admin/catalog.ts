import { z } from "zod";
import { db } from "@/lib/db";
import { ProductStatus } from "@/generated/prisma/enums";
import type { PublicUser } from "@/server/auth/auth.service";

const statusValues = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;
const optionalHttpsUrl = z.preprocess((value) => value === "" ? undefined : value, z.string().url().max(2_000).refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.").optional());
const money = z.coerce.number().finite().min(0).max(999_999_999);

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use um slug em minúsculas, com hífens."),
  sku: z.string().trim().min(2).max(80).regex(/^[A-Za-z0-9._-]+$/, "SKU inválido."),
  shortDescription: z.string().trim().max(500).optional().default(""),
  description: z.string().trim().max(10_000).optional().default(""),
  categoryId: z.string().trim().min(1).max(80).optional().nullable(),
  sellerId: z.string().trim().min(1).max(80).optional(),
  price: money,
  promotionalPrice: z.preprocess((value) => value === "" || value === null ? undefined : value, money.optional()),
  stock: z.coerce.number().int().min(0).max(10_000_000),
  minimumStock: z.coerce.number().int().min(0).max(10_000_000),
  status: z.enum(statusValues).default("DRAFT"),
  featured: z.boolean().default(false),
  isPromotion: z.boolean().default(false),
  imageUrl: optionalHttpsUrl,
}).superRefine((value, context) => {
  if (value.promotionalPrice !== undefined && value.promotionalPrice > value.price) {
    context.addIssue({ code: "custom", path: ["promotionalPrice"], message: "O preço promocional não pode superar o preço original." });
  }
});

export type ProductInput = z.infer<typeof productInputSchema>;

function requireCatalogPermission(user: PublicUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER" && user.role !== "SELLER") throw new Error("FORBIDDEN");
}

async function resolveSeller(user: PublicUser, requestedSellerId?: string) {
  requireCatalogPermission(user);
  if (user.role === "SELLER") {
    const seller = await db.seller.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (!seller || seller.status !== "APPROVED") throw new Error("FORBIDDEN");
    if (requestedSellerId && requestedSellerId !== seller.id) throw new Error("FORBIDDEN");
    return seller.id;
  }
  if (!requestedSellerId) throw new Error("SELLER_NOT_FOUND");
  const seller = await db.seller.findUnique({ where: { id: requestedSellerId }, select: { id: true } });
  if (!seller) throw new Error("SELLER_NOT_FOUND");
  return seller.id;
}

function productDto(product: {
  id: string; name: string; slug: string; sku: string; shortDescription: string | null; description: string | null;
  price: unknown; promotionalPrice: unknown; stock: number; minimumStock: number; status: ProductStatus;
  featured: boolean; isPromotion: boolean; category: { id: string; name: string } | null;
  seller: { id: string; tradeName: string; store: { name: string } | null };
  images: Array<{ url: string; alt: string | null }>;
}) {
  return {
    id: product.id, name: product.name, slug: product.slug, sku: product.sku,
    shortDescription: product.shortDescription, description: product.description,
    price: Number(product.price), promotionalPrice: product.promotionalPrice === null ? null : Number(product.promotionalPrice),
    stock: product.stock, minimumStock: product.minimumStock, status: product.status,
    featured: product.featured, isPromotion: product.isPromotion,
    category: product.category, seller: { id: product.seller.id, name: product.seller.store?.name ?? product.seller.tradeName },
    imageUrl: product.images[0]?.url ?? null,
    lowStock: product.stock <= product.minimumStock,
  };
}

const productInclude = {
  category: { select: { id: true, name: true } },
  seller: { select: { id: true, tradeName: true, store: { select: { name: true } } } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" as const }, take: 1 },
} as const;

export async function listManagedProducts(user: PublicUser) {
  requireCatalogPermission(user);
  const seller = user.role === "SELLER" ? await db.seller.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
  const products = await db.product.findMany({ where: seller ? { sellerId: seller.id } : undefined, include: productInclude, orderBy: { updatedAt: "desc" }, take: 200 });
  return products.map(productDto);
}

export async function createManagedProduct(user: PublicUser, input: unknown) {
  const data = productInputSchema.parse(input);
  const sellerId = await resolveSeller(user, data.sellerId);
  const status = user.role === "SELLER" && data.status === "ACTIVE" ? "PENDING_REVIEW" : data.status;
  try {
    const product = await db.$transaction(async (transaction) => {
      const created = await transaction.product.create({
        data: {
          sellerId, categoryId: data.categoryId || null, name: data.name, slug: data.slug, sku: data.sku,
          shortDescription: data.shortDescription || null, description: data.description || null,
          price: data.price, promotionalPrice: data.promotionalPrice ?? null, stock: data.stock, minimumStock: data.minimumStock,
          status, featured: data.featured, isPromotion: data.isPromotion,
          images: data.imageUrl ? { create: { url: data.imageUrl, alt: data.name, position: 0 } } : undefined,
        }, include: productInclude,
      });
      await transaction.auditLog.create({ data: { userId: user.id, action: "CREATE", entity: "Product", entityId: created.id, afterData: { name: created.name, sku: created.sku, status: created.status } } });
      return created;
    });
    return productDto(product);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("PRODUCT_CONFLICT");
    throw error;
  }
}

export async function updateManagedProduct(user: PublicUser, id: string, input: unknown) {
  const data = productInputSchema.parse(input);
  const current = await db.product.findUnique({ where: { id }, select: { id: true, sellerId: true, status: true, name: true, sku: true, stock: true } });
  if (!current) throw new Error("PRODUCT_NOT_FOUND");
  if (user.role === "SELLER") {
    const seller = await db.seller.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (!seller || seller.id !== current.sellerId || seller.status !== "APPROVED") throw new Error("FORBIDDEN");
  } else if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN");
  const status = user.role === "SELLER" && data.status === "ACTIVE" ? "PENDING_REVIEW" : data.status;
  try {
    const product = await db.$transaction(async (transaction) => {
      const updated = await transaction.product.update({
        where: { id },
        data: {
          categoryId: data.categoryId || null, name: data.name, slug: data.slug, sku: data.sku,
          shortDescription: data.shortDescription || null, description: data.description || null,
          price: data.price, promotionalPrice: data.promotionalPrice ?? null, stock: data.stock, minimumStock: data.minimumStock,
          status, featured: data.featured, isPromotion: data.isPromotion,
        }, include: productInclude,
      });
      if (data.imageUrl !== undefined) {
        await transaction.productImage.deleteMany({ where: { productId: id } });
        if (data.imageUrl) await transaction.productImage.create({ data: { productId: id, url: data.imageUrl, alt: data.name, position: 0 } });
      }
      await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Product", entityId: id, beforeData: current, afterData: { name: updated.name, sku: updated.sku, status: updated.status, stock: updated.stock } } });
      return updated;
    });
    return productDto(product);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("PRODUCT_CONFLICT");
    throw error;
  }
}

export async function archiveManagedProduct(user: PublicUser, id: string) {
  const current = await db.product.findUnique({ where: { id }, select: { id: true, sellerId: true, status: true } });
  if (!current) throw new Error("PRODUCT_NOT_FOUND");
  if (user.role === "SELLER") {
    const seller = await db.seller.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (!seller || seller.id !== current.sellerId || seller.status !== "APPROVED") throw new Error("FORBIDDEN");
  } else if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN");
  await db.$transaction(async (transaction) => {
    await transaction.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await transaction.auditLog.create({ data: { userId: user.id, action: "ARCHIVE", entity: "Product", entityId: id, beforeData: current, afterData: { status: "ARCHIVED" } } });
  });
}
