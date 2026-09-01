import { z } from "zod";
import { db } from "@/lib/db";
import type { PublicUser } from "@/server/auth/auth.service";
import { OrderStatus } from "@/generated/prisma/enums";

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().trim().max(500).optional(),
});

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  AWAITING_PAYMENT: [OrderStatus.PAYMENT_PENDING, OrderStatus.PAID, OrderStatus.CANCELLED],
  PAYMENT_PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
};

function canManageAll(user: PublicUser) { return user.role === "ADMIN" || user.role === "MANAGER"; }

export async function updateManagedOrder(user: PublicUser, number: string, input: unknown) {
  const data = updateOrderSchema.parse(input);
  if (!canManageAll(user) && user.role !== "SELLER") throw new Error("FORBIDDEN");
  const order = await db.order.findUnique({ where: { number }, select: { id: true, number: true, sellerId: true, status: true } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (user.role === "SELLER") {
    const seller = await db.seller.findUnique({ where: { userId: user.id }, select: { id: true, status: true } });
    if (!seller || seller.id !== order.sellerId || seller.status !== "APPROVED") throw new Error("FORBIDDEN");
    const sellerStatuses: readonly OrderStatus[] = [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    if (!sellerStatuses.includes(data.status)) throw new Error("FORBIDDEN");
  }
  if (!transitions[order.status].includes(data.status)) throw new Error("INVALID_STATUS_TRANSITION");
  const updated = await db.$transaction(async (transaction) => {
    const next = await transaction.order.update({ where: { id: order.id }, data: { status: data.status } });
    if (data.status === OrderStatus.CANCELLED && (order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.PAYMENT_PENDING)) {
      const items = await transaction.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, quantity: true } });
      for (const item of items) await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    await transaction.orderEvent.create({ data: { orderId: order.id, status: data.status, note: data.note || `Status atualizado para ${data.status}` } });
    await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE_STATUS", entity: "Order", entityId: order.id, beforeData: { status: order.status }, afterData: { status: next.status, note: data.note || null } } });
    return next;
  });
  return { number: updated.number, status: updated.status };
}
