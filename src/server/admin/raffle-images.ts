import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { hasValidImageSignature, isAllowedImageType, MAX_IMAGE_BYTES } from "@/server/admin/product-images";
import type { PublicUser } from "@/server/auth/auth.service";

export const MAX_RAFFLE_IMAGES = 5;

const allowedImageTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
} as const;

const uploadRoot = path.resolve(process.cwd(), "public", "uploads", "raffles");

function raffleDirectory(raffleId: string) {
  const safeRaffleId = raffleId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(uploadRoot, safeRaffleId);
}

function localPathFromUrl(url: string) {
  const prefix = "/uploads/raffles/";
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

async function assertRaffleAccess(user: PublicUser, raffleId: string) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN");
  const raffle = await db.raffle.findUnique({ where: { id: raffleId }, select: { id: true, title: true } });
  if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
  return raffle;
}

function imageDto(image: { id: string; url: string; alt: string | null; position: number }) {
  return { id: image.id, url: image.url, alt: image.alt, position: image.position };
}

async function raffleImages(raffleId: string) {
  const images = await db.raffleImage.findMany({ where: { raffleId }, orderBy: { position: "asc" }, take: MAX_RAFFLE_IMAGES });
  return images.map(imageDto);
}

export async function uploadManagedRaffleImages(user: PublicUser, raffleId: string, files: File[]) {
  const raffle = await assertRaffleAccess(user, raffleId);
  const selectedFiles = files.filter((file) => file.size > 0);
  if (!selectedFiles.length) throw new Error("IMAGE_REQUIRED");
  if (selectedFiles.length > MAX_RAFFLE_IMAGES) throw new Error("IMAGE_LIMIT");

  const existingCount = await db.raffleImage.count({ where: { raffleId: raffle.id } });
  if (existingCount + selectedFiles.length > MAX_RAFFLE_IMAGES) throw new Error("IMAGE_LIMIT");

  const prepared = [] as Array<{ buffer: Buffer; extension: string }>;
  for (const file of selectedFiles) {
    if (file.size > MAX_IMAGE_BYTES) throw new Error("IMAGE_SIZE");
    if (!isAllowedImageType(file.type)) throw new Error("IMAGE_TYPE");
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, file.type)) throw new Error("IMAGE_INVALID");
    prepared.push({ buffer, extension: allowedImageTypes[file.type] });
  }

  const directory = raffleDirectory(raffle.id);
  await mkdir(directory, { recursive: true });
  const writtenFiles: Array<{ path: string; url: string }> = [];
  try {
    for (const file of prepared) {
      const filename = `${randomUUID()}${file.extension}`;
      const filePath = path.join(directory, filename);
      await writeFile(filePath, file.buffer, { flag: "wx", mode: 0o644 });
      writtenFiles.push({ path: filePath, url: `/uploads/raffles/${raffle.id}/${filename}` });
    }

    await db.$transaction(async (transaction) => {
      // Serializa uploads concorrentes pelo registro da rifa antes de contar as imagens.
      await transaction.raffle.update({ where: { id: raffle.id }, data: { updatedAt: new Date() } });
      const currentCount = await transaction.raffleImage.count({ where: { raffleId: raffle.id } });
      if (currentCount + writtenFiles.length > MAX_RAFFLE_IMAGES) throw new Error("IMAGE_LIMIT");
      const maxPosition = await transaction.raffleImage.aggregate({ where: { raffleId: raffle.id }, _max: { position: true } });
      const firstPosition = (maxPosition._max.position ?? -1) + 1;
      for (const [index, file] of writtenFiles.entries()) {
        await transaction.raffleImage.create({ data: { raffleId: raffle.id, url: file.url, alt: raffle.title, position: firstPosition + index } });
      }
      await transaction.auditLog.create({ data: { userId: user.id, action: "UPLOAD_IMAGES", entity: "Raffle", entityId: raffle.id, afterData: { count: writtenFiles.length, source: "local" } } });
    });
  } catch (error) {
    await Promise.allSettled(writtenFiles.map((file) => unlink(file.path)));
    throw error;
  }

  return raffleImages(raffle.id);
}

export async function deleteManagedRaffleImage(user: PublicUser, raffleId: string, imageId: string) {
  await assertRaffleAccess(user, raffleId);
  const image = await db.raffleImage.findFirst({ where: { id: imageId, raffleId }, select: { id: true, url: true } });
  if (!image) throw new Error("IMAGE_NOT_FOUND");

  await db.$transaction(async (transaction) => {
    await transaction.raffleImage.delete({ where: { id: image.id } });
    const remaining = await transaction.raffleImage.findMany({ where: { raffleId }, orderBy: { position: "asc" }, select: { id: true } });
    for (const [position, remainingImage] of remaining.entries()) {
      await transaction.raffleImage.update({ where: { id: remainingImage.id }, data: { position } });
    }
    await transaction.auditLog.create({ data: { userId: user.id, action: "DELETE_IMAGE", entity: "Raffle", entityId: raffleId, afterData: { imageId } } });
  });

  await removeLocalFile(image.url);
}
