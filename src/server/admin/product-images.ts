import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import type { PublicUser } from "@/server/auth/auth.service";

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const allowedImageTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
} as const;

type AllowedImageType = keyof typeof allowedImageTypes;
const uploadRoot = path.resolve(process.cwd(), "public", "uploads", "products");

export function isAllowedImageType(type: string): type is AllowedImageType {
  return Object.hasOwn(allowedImageTypes, type);
}

export function hasValidImageSignature(buffer: Uint8Array, type: AllowedImageType) {
  if (type === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === "image/png") return buffer.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => buffer[index] === value);
  if (type === "image/webp") return buffer.length >= 12 && Buffer.from(buffer.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(buffer.subarray(8, 12)).toString("ascii") === "WEBP";
  return buffer.length >= 12 && Buffer.from(buffer.subarray(4, 8)).toString("ascii") === "ftyp" && ["avif", "avis", "mif1", "msf1"].includes(Buffer.from(buffer.subarray(8, 12)).toString("ascii"));
}

function productDirectory(productId: string) {
  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(uploadRoot, safeProductId);
}

function localPathFromUrl(url: string) {
  const prefix = "/uploads/products/";
  if (!url.startsWith(prefix)) return null;
  const candidate = path.resolve(process.cwd(), "public", url.slice(1));
  if (!candidate.startsWith(`${uploadRoot}${path.sep}`)) return null;
  return candidate;
}

async function removeLocalFile(url: string) {
  const filePath = localPathFromUrl(url);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
  }
}

async function assertProductAccess(user: PublicUser, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, name: true, sellerId: true } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (user.role === "ADMIN" || user.role === "MANAGER") return product;
  if (user.role !== "SELLER") throw new Error("FORBIDDEN");
  const seller = await db.seller.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
  if (!seller || seller.id !== product.sellerId || seller.status !== "APPROVED") throw new Error("FORBIDDEN");
  return product;
}

function imageDto(image: { id: string; url: string; alt: string | null; position: number }) {
  return { id: image.id, url: image.url, alt: image.alt, position: image.position };
}

async function productImages(productId: string) {
  const images = await db.productImage.findMany({ where: { productId }, orderBy: { position: "asc" } });
  return images.map(imageDto);
}

export async function uploadManagedProductImages(user: PublicUser, productId: string, files: File[]) {
  const product = await assertProductAccess(user, productId);
  const selectedFiles = files.filter((file) => file.size > 0);
  if (!selectedFiles.length) throw new Error("IMAGE_REQUIRED");
  if (selectedFiles.length > MAX_PRODUCT_IMAGES) throw new Error("IMAGE_LIMIT");

  const existingCount = await db.productImage.count({ where: { productId: product.id } });
  if (existingCount + selectedFiles.length > MAX_PRODUCT_IMAGES) throw new Error("IMAGE_LIMIT");

  const prepared = [] as Array<{ buffer: Buffer; extension: string }>;
  for (const file of selectedFiles) {
    if (file.size > MAX_IMAGE_BYTES) throw new Error("IMAGE_SIZE");
    if (!isAllowedImageType(file.type)) throw new Error("IMAGE_TYPE");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, file.type)) throw new Error("IMAGE_INVALID");
    prepared.push({ buffer, extension: allowedImageTypes[file.type] });
  }

  const directory = productDirectory(product.id);
  await mkdir(directory, { recursive: true });
  const writtenFiles: Array<{ path: string; url: string }> = [];
  try {
    for (const file of prepared) {
      const filename = `${randomUUID()}${file.extension}`;
      const filePath = path.join(directory, filename);
      await writeFile(filePath, file.buffer, { flag: "wx", mode: 0o644 });
      writtenFiles.push({ path: filePath, url: `/uploads/products/${product.id}/${filename}` });
    }

    await db.$transaction(async (transaction) => {
      // Serializa uploads concorrentes pelo registro do produto antes de contar as imagens.
      await transaction.product.update({ where: { id: product.id }, data: { updatedAt: new Date() } });
      const currentCount = await transaction.productImage.count({ where: { productId: product.id } });
      if (currentCount + writtenFiles.length > MAX_PRODUCT_IMAGES) throw new Error("IMAGE_LIMIT");
      const maxPosition = await transaction.productImage.aggregate({ where: { productId: product.id }, _max: { position: true } });
      const firstPosition = (maxPosition._max.position ?? -1) + 1;
      for (const [index, file] of writtenFiles.entries()) {
        await transaction.productImage.create({ data: { productId: product.id, url: file.url, alt: product.name, position: firstPosition + index } });
      }
      await transaction.auditLog.create({ data: { userId: user.id, action: "UPLOAD_IMAGES", entity: "Product", entityId: product.id, afterData: { count: writtenFiles.length, source: "local" } } });
    });
  } catch (error) {
    await Promise.allSettled(writtenFiles.map((file) => unlink(file.path)));
    throw error;
  }

  return productImages(product.id);
}

export async function deleteManagedProductImage(user: PublicUser, productId: string, imageId: string) {
  await assertProductAccess(user, productId);
  const image = await db.productImage.findFirst({ where: { id: imageId, productId }, select: { id: true, url: true } });
  if (!image) throw new Error("IMAGE_NOT_FOUND");

  await db.$transaction(async (transaction) => {
    await transaction.productImage.delete({ where: { id: image.id } });
    const remaining = await transaction.productImage.findMany({ where: { productId }, orderBy: { position: "asc" }, select: { id: true } });
    for (const [position, remainingImage] of remaining.entries()) {
      await transaction.productImage.update({ where: { id: remainingImage.id }, data: { position } });
    }
    await transaction.auditLog.create({ data: { userId: user.id, action: "DELETE_IMAGE", entity: "Product", entityId: productId, afterData: { imageId } } });
  });

  await removeLocalFile(image.url);
}
