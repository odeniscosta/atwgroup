import { z } from "zod";
import { db } from "@/lib/db";

const maxReferences = 10;

export const trackingInputSchema = z.object({
  number: z.string().trim().min(4).max(500),
  email: z.string().trim().email().max(160),
});

export type TrackingInput = z.infer<typeof trackingInputSchema>;

export type TrackedOrder = {
  number: string;
  status: string;
  total: number;
  createdAt: string;
  events: Array<{ status: string; createdAt: string }>;
};

export type TrackingResult = {
  source: "database";
  orders: TrackedOrder[];
};

function normalize(value: string | undefined) {
  return value?.trim().toLocaleLowerCase("pt-BR") ?? "";
}

export function normalizeTrackingReferences(value: string) {
  const references = value
    .split(/[\s,;]+/)
    .map((reference) => reference.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(references)].slice(0, maxReferences);
}

function readEmail(value: unknown) {
  if (!value || typeof value !== "object" || !("email" in value)) return undefined;
  const email = value.email;
  return typeof email === "string" ? email : undefined;
}

export function parseTrackingInput(value: unknown): TrackingInput {
  const input = trackingInputSchema.parse(value);
  const references = normalizeTrackingReferences(input.number);
  if (!references.length) throw new Error("Informe um número de pedido.");
  return { ...input, number: references.join(",") };
}

export async function findTrackedOrders(input: TrackingInput): Promise<TrackingResult> {
  if (!process.env.DATABASE_URL || process.env.ATW_ORDER_SOURCE === "demo") {
    throw new Error("ORDER_TRACKING_UNAVAILABLE");
  }

  const references = normalizeTrackingReferences(input.number);
  const email = normalize(input.email);
  const [orders, raffleOrders] = await Promise.all([
    db.order.findMany({
      where: { number: { in: references } },
      include: { events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.raffleOrder.findMany({
      where: { number: { in: references } },
      include: { events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const authorizedOrders: TrackedOrder[] = [
    ...orders.filter((order) => normalize(readEmail(order.shippingAddress)) === email).map((order) => ({
      number: order.number,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      events: order.events.map((event) => ({ status: event.status, createdAt: event.createdAt.toISOString() })),
    })),
    ...raffleOrders.filter((order) => normalize(order.buyerEmail) === email).map((order) => ({
      number: order.number,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      events: order.events.map((event) => ({ status: event.status, createdAt: event.createdAt.toISOString() })),
    })),
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    source: "database",
    orders: authorizedOrders,
  };
}
