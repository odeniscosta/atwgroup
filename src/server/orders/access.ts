import { db } from "@/lib/db";
import { OrderStatus } from "@/generated/prisma/enums";

export type PublicOrderSummary = {
  number: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  storeName: string;
  events: Array<{ status: OrderStatus; note: string | null; createdAt: string }>;
};

type OrderRecord = {
  number: string;
  status: OrderStatus;
  total: unknown;
  createdAt: Date;
  seller: { store: { name: string } | null };
  events: Array<{ status: OrderStatus; note: string | null; createdAt: Date }>;
};

const orderSelect = {
  number: true,
  status: true,
  total: true,
  createdAt: true,
  seller: { select: { store: { select: { name: true } } } },
  events: { select: { status: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" as const }, take: 20 },
} as const;

function toSummary(order: OrderRecord): PublicOrderSummary {
  return {
    number: order.number,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    storeName: order.seller.store?.name ?? "ATW Group",
    events: order.events.map((event) => ({ status: event.status, note: event.note, createdAt: event.createdAt.toISOString() })),
  };
}

export async function listCustomerOrders(userId: string) {
  const customer = await db.customer.findUnique({ where: { userId }, select: { id: true } });
  if (!customer) return [] satisfies PublicOrderSummary[];
  const orders = await db.order.findMany({ where: { customerId: customer.id }, select: orderSelect, orderBy: { createdAt: "desc" }, take: 50 });
  return orders.map((order) => toSummary(order as OrderRecord));
}

export async function listSellerOrders(userId: string) {
  const seller = await db.seller.findUnique({ where: { userId }, select: { id: true } });
  if (!seller) return [] satisfies PublicOrderSummary[];
  const orders = await db.order.findMany({ where: { sellerId: seller.id }, select: orderSelect, orderBy: { createdAt: "desc" }, take: 100 });
  return orders.map((order) => toSummary(order as OrderRecord));
}

export async function listAdminOrders(options: { status?: OrderStatus; limit: number }) {
  const orders = await db.order.findMany({
    where: options.status ? { status: options.status } : undefined,
    select: orderSelect,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });
  return orders.map((order) => toSummary(order as OrderRecord));
}
