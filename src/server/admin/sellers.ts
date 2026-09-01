import { z } from "zod";
import type { PublicUser } from "@/server/auth/auth.service";
import { db } from "@/lib/db";

const sellerStatusSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "BLOCKED"]) });

function assertAdmin(user: PublicUser) { if (user.role !== "ADMIN") throw new Error("FORBIDDEN"); }
function assertRead(user: PublicUser) { if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN"); }

export async function listManagedSellers(user: PublicUser) {
  assertRead(user);
  return db.seller.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, tradeName: true, legalName: true, status: true, commissionRate: true, createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      store: { select: { name: true, slug: true } },
      _count: { select: { products: true, orders: true } },
    },
  });
}

export async function updateSellerStatus(user: PublicUser, id: string, input: unknown) {
  assertAdmin(user);
  const data = sellerStatusSchema.parse(input);
  const before = await db.seller.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!before) throw new Error("SELLER_NOT_FOUND");
  const seller = await db.$transaction(async (transaction) => {
    const updated = await transaction.seller.update({ where: { id }, data: { status: data.status } });
    await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE_STATUS", entity: "Seller", entityId: id, beforeData: before, afterData: { status: updated.status } } });
    return updated;
  });
  return seller;
}
