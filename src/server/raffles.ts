import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaymentStatus, RaffleOrderStatus, RaffleStatus, RaffleTicketStatus } from "@/generated/prisma/enums";
import type { PublicUser } from "@/server/auth/auth.service";
import { createConfiguredPaymentGateway, type PaymentResult } from "@/services/payments/payment-gateway";

const raffleStatuses = ["DRAFT", "OPEN", "PAUSED", "DRAWN", "CANCELLED"] as const;
const maxRaffleNumbers = 10_000;
const reservationMinutes = 15;
const raffleCategorySlug = "rifas";

const optionalHttpsUrl = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().url().max(2_000).refine((value) => value.startsWith("https://"), "Use uma URL HTTPS.").optional(),
);

const optionalDate = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.date().optional(),
);

export const raffleInputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use um slug em minúsculas, com hífens."),
  description: z.string().trim().max(10_000).optional().default(""),
  imageUrl: optionalHttpsUrl,
  ticketPrice: z.coerce.number().finite().positive().max(999_999),
  totalNumbers: z.coerce.number().int().min(2).max(maxRaffleNumbers),
  maxPerCustomer: z.coerce.number().int().min(1).max(maxRaffleNumbers),
  drawAt: optionalDate,
}).superRefine((value, context) => {
  if (value.maxPerCustomer > value.totalNumbers) {
    context.addIssue({ code: "custom", path: ["maxPerCustomer"], message: "O limite por participante não pode superar a quantidade de números." });
  }
  if (value.drawAt && value.drawAt <= new Date()) {
    context.addIssue({ code: "custom", path: ["drawAt"], message: "A data do sorteio deve estar no futuro." });
  }
});

export const raffleOrderInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(30),
  numbers: z.array(z.coerce.number().int().min(1).max(maxRaffleNumbers)).min(1).max(100),
}).superRefine((value, context) => {
  if (new Set(value.numbers).size !== value.numbers.length) {
    context.addIssue({ code: "custom", path: ["numbers"], message: "Escolha cada número apenas uma vez." });
  }
});

export const raffleStatusSchema = z.object({ status: z.enum(raffleStatuses) });

export type RaffleInput = z.infer<typeof raffleInputSchema>;
export type RaffleOrderInput = z.infer<typeof raffleOrderInputSchema>;

export type RafflePublic = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  images: Array<{ id: string; url: string; alt: string | null; position: number }>;
  ticketPrice: number;
  totalNumbers: number;
  maxPerCustomer: number;
  drawAt: string | null;
  status: RaffleStatus;
  winningNumber: number | null;
  soldCount: number;
  reservedCount: number;
  availableCount: number;
  occupiedNumbers: number[];
};

type TicketCounts = { soldCount: number; reservedCount: number };

const raffleSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  imageUrl: true,
  images: { select: { id: true, url: true, alt: true, position: true }, orderBy: { position: "asc" }, take: 5 },
  ticketPrice: true,
  totalNumbers: true,
  maxPerCustomer: true,
  drawAt: true,
  status: true,
  winningNumber: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

function assertRaffleRead(user: PublicUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN");
}

function assertRaffleWrite(user: PublicUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("FORBIDDEN");
}

function assertRaffleDraw(user: PublicUser) {
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function normalizeRaffleNumbers(numbers: number[]) {
  return [...new Set(numbers)].sort((first, second) => first - second);
}

export function calculateRaffleTotal(ticketPrice: number, numberCount: number) {
  return Number((ticketPrice * numberCount).toFixed(2));
}

export function canTransitionRaffle(from: RaffleStatus, to: RaffleStatus) {
  const transitions: Record<RaffleStatus, readonly RaffleStatus[]> = {
    DRAFT: [RaffleStatus.OPEN, RaffleStatus.CANCELLED],
    OPEN: [RaffleStatus.PAUSED, RaffleStatus.CANCELLED],
    PAUSED: [RaffleStatus.OPEN, RaffleStatus.CANCELLED],
    DRAWN: [],
    CANCELLED: [],
  };
  return transitions[from].includes(to);
}

function generateRaffleOrderNumber() {
  return `RIF${Date.now().toString().slice(-8)}${randomBytes(3).toString("hex").toUpperCase()}`;
}

function paymentStatus(status: PaymentResult["status"]) {
  if (status === "approved") return PaymentStatus.APPROVED;
  if (status === "cancelled") return PaymentStatus.CANCELLED;
  if (status === "refunded") return PaymentStatus.REFUNDED;
  if (status === "rejected") return PaymentStatus.REJECTED;
  return PaymentStatus.PENDING;
}

function orderStatus(status: PaymentResult["status"]): RaffleOrderStatus {
  if (status === "approved") return RaffleOrderStatus.PAID;
  if (status === "refunded") return RaffleOrderStatus.REFUNDED;
  if (status === "cancelled" || status === "rejected") return RaffleOrderStatus.CANCELLED;
  return RaffleOrderStatus.PAYMENT_PENDING;
}

async function ticketCounts(raffleIds: string[]) {
  const counts = new Map<string, TicketCounts>();
  if (!raffleIds.length) return counts;
  const groups = await db.raffleTicket.groupBy({
    by: ["raffleId", "status"],
    where: { raffleId: { in: raffleIds }, status: { in: [RaffleTicketStatus.PAID, RaffleTicketStatus.RESERVED] } },
    _count: { _all: true },
  });
  for (const group of groups) {
    const current = counts.get(group.raffleId) ?? { soldCount: 0, reservedCount: 0 };
    if (group.status === RaffleTicketStatus.PAID) current.soldCount = group._count._all;
    if (group.status === RaffleTicketStatus.RESERVED) current.reservedCount = group._count._all;
    counts.set(group.raffleId, current);
  }
  return counts;
}

function countsFor(raffle: { id: string; totalNumbers: number }, counts: Map<string, TicketCounts>) {
  const current = counts.get(raffle.id) ?? { soldCount: 0, reservedCount: 0 };
  return { ...current, availableCount: Math.max(raffle.totalNumbers - current.soldCount - current.reservedCount, 0) };
}

function adminDto(raffle: {
  id: string; title: string; slug: string; description: string | null; imageUrl: string | null;
  images: Array<{ id: string; url: string; alt: string | null; position: number }>;
  ticketPrice: unknown; totalNumbers: number; maxPerCustomer: number; drawAt: Date | null; status: RaffleStatus;
  winningNumber: number | null; category: { id: string; name: string; slug: string };
}, counts: Map<string, TicketCounts>) {
  return {
    id: raffle.id,
    title: raffle.title,
    slug: raffle.slug,
    description: raffle.description,
    imageUrl: raffle.imageUrl,
    images: raffle.images,
    ticketPrice: Number(raffle.ticketPrice),
    totalNumbers: raffle.totalNumbers,
    maxPerCustomer: raffle.maxPerCustomer,
    drawAt: raffle.drawAt?.toISOString() ?? null,
    status: raffle.status,
    winningNumber: raffle.winningNumber,
    category: raffle.category,
    ...countsFor(raffle, counts),
  };
}

export async function listManagedRaffles(user: PublicUser) {
  assertRaffleRead(user);
  await releaseExpiredRaffleOrders();
  const raffles = await db.raffle.findMany({ select: raffleSelect, orderBy: { updatedAt: "desc" }, take: 200 });
  const counts = await ticketCounts(raffles.map((raffle) => raffle.id));
  return raffles.map((raffle) => adminDto(raffle, counts));
}

export async function listManagedRaffleOrders(user: PublicUser, raffleId?: string) {
  assertRaffleRead(user);
  await releaseExpiredRaffleOrders();
  const orders = await db.raffleOrder.findMany({
    where: raffleId ? { raffleId } : undefined,
    select: {
      number: true,
      buyerName: true,
      buyerEmail: true,
      buyerPhone: true,
      total: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      raffle: { select: { title: true, slug: true } },
      tickets: { select: { number: true, status: true }, orderBy: { number: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return orders.map((order) => ({
    number: order.number,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    total: Number(order.total),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    expiresAt: order.expiresAt.toISOString(),
    raffle: order.raffle,
    tickets: order.tickets,
  }));
}

async function raffleCategoryId(transaction: Parameters<Parameters<typeof db.$transaction>[0]>[0]) {
  const category = await transaction.category.findUnique({ where: { slug: raffleCategorySlug }, select: { id: true } });
  if (category) return category.id;
  const created = await transaction.category.create({ data: { name: "Rifas", slug: raffleCategorySlug, description: "Produtos e campanhas de rifas da ATW Group." }, select: { id: true } });
  return created.id;
}

export async function createManagedRaffle(user: PublicUser, input: unknown) {
  assertRaffleWrite(user);
  const data = raffleInputSchema.parse(input);
  try {
    const raffle = await db.$transaction(async (transaction) => {
      const categoryId = await raffleCategoryId(transaction);
      const created = await transaction.raffle.create({
        data: {
          categoryId,
          title: data.title,
          slug: data.slug,
          description: data.description || null,
          imageUrl: data.imageUrl,
          ticketPrice: data.ticketPrice,
          totalNumbers: data.totalNumbers,
          maxPerCustomer: data.maxPerCustomer,
          drawAt: data.drawAt,
        },
        select: raffleSelect,
      });
      await transaction.auditLog.create({ data: { userId: user.id, action: "CREATE", entity: "Raffle", entityId: created.id, afterData: { title: created.title, slug: created.slug, ticketPrice: data.ticketPrice, totalNumbers: data.totalNumbers } } });
      return created;
    });
    return adminDto(raffle, new Map());
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("RAFFLE_CONFLICT");
    throw error;
  }
}

export async function updateManagedRaffle(user: PublicUser, id: string, input: unknown) {
  assertRaffleWrite(user);
  const data = raffleInputSchema.parse(input);
  const current = await db.raffle.findUnique({ where: { id }, select: { ...raffleSelect, status: true } });
  if (!current) throw new Error("RAFFLE_NOT_FOUND");
  if (current.status === RaffleStatus.DRAWN || current.status === RaffleStatus.CANCELLED) throw new Error("RAFFLE_IMMUTABLE");
  if (current.status === RaffleStatus.OPEN && (data.ticketPrice !== Number(current.ticketPrice) || data.totalNumbers !== current.totalNumbers)) throw new Error("RAFFLE_OPEN_IMMUTABLE");
  const maxTicket = await db.raffleTicket.aggregate({ where: { raffleId: id }, _max: { number: true } });
  if (maxTicket._max.number && data.totalNumbers < maxTicket._max.number) throw new Error("RAFFLE_NUMBER_RANGE");
  try {
    const raffle = await db.$transaction(async (transaction) => {
      const updated = await transaction.raffle.update({
        where: { id },
        data: { title: data.title, slug: data.slug, description: data.description || null, imageUrl: data.imageUrl, ticketPrice: data.ticketPrice, totalNumbers: data.totalNumbers, maxPerCustomer: data.maxPerCustomer, drawAt: data.drawAt },
        select: raffleSelect,
      });
      await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE", entity: "Raffle", entityId: id, beforeData: { title: current.title, status: current.status, ticketPrice: Number(current.ticketPrice), totalNumbers: current.totalNumbers }, afterData: { title: updated.title, status: updated.status, ticketPrice: Number(updated.ticketPrice), totalNumbers: updated.totalNumbers } } });
      return updated;
    });
    const counts = await ticketCounts([raffle.id]);
    return adminDto(raffle, counts);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("RAFFLE_CONFLICT");
    throw error;
  }
}

export async function updateManagedRaffleStatus(user: PublicUser, id: string, input: unknown) {
  assertRaffleWrite(user);
  const data = raffleStatusSchema.parse(input);
  const current = await db.raffle.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!current) throw new Error("RAFFLE_NOT_FOUND");
  if (data.status === RaffleStatus.DRAWN) throw new Error("RAFFLE_DRAW_REQUIRED");
  if (!canTransitionRaffle(current.status, data.status)) throw new Error("INVALID_RAFFLE_STATUS_TRANSITION");
  const updated = await db.$transaction(async (transaction) => {
    const result = await transaction.raffle.update({ where: { id }, data: { status: data.status } });
    await transaction.auditLog.create({ data: { userId: user.id, action: "UPDATE_STATUS", entity: "Raffle", entityId: id, beforeData: { status: current.status }, afterData: { status: result.status } } });
    return result;
  });
  return { id: updated.id, status: updated.status };
}

export async function drawManagedRaffle(user: PublicUser, id: string) {
  assertRaffleDraw(user);
  const result = await db.$transaction(async (transaction) => {
    const raffle = await transaction.raffle.findUnique({ where: { id }, select: { id: true, title: true, status: true, drawAt: true } });
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    if (raffle.status !== RaffleStatus.OPEN && raffle.status !== RaffleStatus.PAUSED) throw new Error("RAFFLE_DRAW_UNAVAILABLE");
    if (raffle.drawAt && raffle.drawAt > new Date()) throw new Error("RAFFLE_DRAW_TOO_EARLY");
    const tickets = await transaction.raffleTicket.findMany({ where: { raffleId: id, status: RaffleTicketStatus.PAID }, select: { number: true }, orderBy: { number: "asc" } });
    if (!tickets.length) throw new Error("RAFFLE_NO_PAID_TICKETS");
    const winningNumber = tickets[randomInt(tickets.length)]?.number;
    if (!winningNumber) throw new Error("RAFFLE_NO_PAID_TICKETS");
    const updated = await transaction.raffle.updateMany({ where: { id, status: { in: [RaffleStatus.OPEN, RaffleStatus.PAUSED] } }, data: { status: RaffleStatus.DRAWN, winningNumber, drawnAt: new Date() } });
    if (updated.count !== 1) throw new Error("RAFFLE_ALREADY_DRAWN");
    await transaction.auditLog.create({ data: { userId: user.id, action: "DRAW", entity: "Raffle", entityId: id, afterData: { winningNumber, paidTickets: tickets.length } } });
    return { title: raffle.title, winningNumber, paidTickets: tickets.length };
  });
  return result;
}

export async function releaseExpiredRaffleOrders() {
  const expired = await db.raffleOrder.findMany({ where: { status: RaffleOrderStatus.PAYMENT_PENDING, expiresAt: { lt: new Date() } }, select: { id: true, number: true } });
  if (!expired.length) return 0;
  let released = 0;
  await db.$transaction(async (transaction) => {
    for (const order of expired) {
      const updated = await transaction.raffleOrder.updateMany({ where: { id: order.id, status: RaffleOrderStatus.PAYMENT_PENDING }, data: { status: RaffleOrderStatus.EXPIRED } });
      if (updated.count !== 1) continue;
      await transaction.raffleTicket.updateMany({ where: { orderId: order.id, status: RaffleTicketStatus.RESERVED }, data: { status: RaffleTicketStatus.CANCELLED } });
      await transaction.raffleOrderEvent.create({ data: { orderId: order.id, status: RaffleOrderStatus.EXPIRED, note: "Reserva de números expirada sem confirmação de pagamento" } });
      released += 1;
    }
  });
  return released;
}

function publicDto(raffle: {
  id: string; title: string; slug: string; description: string | null; imageUrl: string | null;
  images: Array<{ id: string; url: string; alt: string | null; position: number }>;
  ticketPrice: unknown; totalNumbers: number; maxPerCustomer: number; drawAt: Date | null; status: RaffleStatus; winningNumber: number | null;
}, counts: TicketCounts, occupiedNumbers: number[]): RafflePublic {
  return {
    id: raffle.id,
    title: raffle.title,
    slug: raffle.slug,
    description: raffle.description,
    imageUrl: raffle.imageUrl,
    images: raffle.images,
    ticketPrice: Number(raffle.ticketPrice),
    totalNumbers: raffle.totalNumbers,
    maxPerCustomer: raffle.maxPerCustomer,
    drawAt: raffle.drawAt?.toISOString() ?? null,
    status: raffle.status,
    winningNumber: raffle.winningNumber,
    soldCount: counts.soldCount,
    reservedCount: counts.reservedCount,
    availableCount: Math.max(raffle.totalNumbers - counts.soldCount - counts.reservedCount, 0),
    occupiedNumbers,
  };
}

export async function listPublicRaffles() {
  await releaseExpiredRaffleOrders();
  const raffles = await db.raffle.findMany({ where: { status: RaffleStatus.OPEN }, select: { ...raffleSelect }, orderBy: [{ drawAt: "asc" }, { createdAt: "desc" }] });
  const counts = await ticketCounts(raffles.map((raffle) => raffle.id));
  return raffles.map((raffle) => ({ ...publicDto(raffle, counts.get(raffle.id) ?? { soldCount: 0, reservedCount: 0 }, []), occupiedNumbers: [] }));
}

export async function getPublicRaffleBySlug(slug: string) {
  await releaseExpiredRaffleOrders();
  const raffle = await db.raffle.findFirst({ where: { slug, status: { in: [RaffleStatus.OPEN, RaffleStatus.PAUSED, RaffleStatus.DRAWN] } }, select: { ...raffleSelect } });
  if (!raffle) return null;
  const tickets = await db.raffleTicket.findMany({ where: { raffleId: raffle.id, status: { in: [RaffleTicketStatus.PAID, RaffleTicketStatus.RESERVED] } }, select: { number: true, status: true }, orderBy: { number: "asc" } });
  const counts = { soldCount: tickets.filter((ticket) => ticket.status === RaffleTicketStatus.PAID).length, reservedCount: tickets.filter((ticket) => ticket.status === RaffleTicketStatus.RESERVED).length };
  return publicDto(raffle, counts, tickets.map((ticket) => ticket.number));
}

async function cancelRaffleOrder(orderId: string, note: string) {
  await db.$transaction(async (transaction) => {
    const updated = await transaction.raffleOrder.updateMany({ where: { id: orderId, status: RaffleOrderStatus.PAYMENT_PENDING }, data: { status: RaffleOrderStatus.CANCELLED } });
    if (updated.count !== 1) return;
    await transaction.raffleTicket.updateMany({ where: { orderId, status: RaffleTicketStatus.RESERVED }, data: { status: RaffleTicketStatus.CANCELLED } });
    await transaction.raffleOrderEvent.create({ data: { orderId, status: RaffleOrderStatus.CANCELLED, note } });
  });
}

async function applyRafflePaymentResult(orderId: string, result: PaymentResult, eventType: string) {
  const paymentState = paymentStatus(result.status);
  const raffleState = orderStatus(result.status);
  await db.$transaction(async (transaction) => {
    const payment = await transaction.rafflePayment.findUnique({ where: { raffleOrderId: orderId }, select: { id: true } });
    if (!payment) throw new Error("RAFFLE_PAYMENT_NOT_FOUND");
    await transaction.rafflePayment.update({ where: { id: payment.id }, data: { provider: result.provider, providerId: result.externalId, status: paymentState, method: "pix" } });
    await transaction.rafflePaymentTransaction.upsert({
      where: { paymentId_externalId: { paymentId: payment.id, externalId: result.externalId } },
      update: { status: paymentState, rawEvent: { type: eventType, provider: result.provider } },
      create: { paymentId: payment.id, externalId: result.externalId, status: paymentState, rawEvent: { type: eventType, provider: result.provider } },
    });
    const current = await transaction.raffleOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!current || current.status === RaffleOrderStatus.EXPIRED) return;
    if (raffleState === RaffleOrderStatus.PAID && current.status === RaffleOrderStatus.PAYMENT_PENDING) {
      await transaction.raffleOrder.update({ where: { id: orderId }, data: { status: RaffleOrderStatus.PAID } });
      await transaction.raffleTicket.updateMany({ where: { orderId, status: RaffleTicketStatus.RESERVED }, data: { status: RaffleTicketStatus.PAID } });
      await transaction.raffleOrderEvent.create({ data: { orderId, status: RaffleOrderStatus.PAID, note: "Pagamento PIX confirmado pelo provedor" } });
    } else if (raffleState === RaffleOrderStatus.CANCELLED && current.status === RaffleOrderStatus.PAYMENT_PENDING) {
      await transaction.raffleOrder.update({ where: { id: orderId }, data: { status: RaffleOrderStatus.CANCELLED } });
      await transaction.raffleTicket.updateMany({ where: { orderId, status: RaffleTicketStatus.RESERVED }, data: { status: RaffleTicketStatus.CANCELLED } });
      await transaction.raffleOrderEvent.create({ data: { orderId, status: RaffleOrderStatus.CANCELLED, note: "Reserva cancelada após rejeição do pagamento" } });
    } else if (raffleState === RaffleOrderStatus.REFUNDED && current.status === RaffleOrderStatus.PAID) {
      await transaction.raffleOrder.update({ where: { id: orderId }, data: { status: RaffleOrderStatus.REFUNDED } });
      await transaction.raffleTicket.updateMany({ where: { orderId, status: RaffleTicketStatus.PAID }, data: { status: RaffleTicketStatus.CANCELLED } });
      await transaction.raffleOrderEvent.create({ data: { orderId, status: RaffleOrderStatus.REFUNDED, note: "Pagamento PIX reembolsado pelo provedor" } });
    }
  });
  return { provider: result.provider, externalId: result.externalId, status: result.status, qrCode: result.qrCode, qrCodeBase64: result.qrCodeBase64 };
}

export async function createRaffleOrder(slug: string, input: RaffleOrderInput, options: { customerId?: string } = {}) {
  const data = raffleOrderInputSchema.parse(input);
  await releaseExpiredRaffleOrders();
  const numbers = normalizeRaffleNumbers(data.numbers);
  const email = normalizeEmail(data.email);
  const order = await db.$transaction(async (transaction) => {
    const raffle = await transaction.raffle.findUnique({ where: { slug }, select: { id: true, title: true, status: true, ticketPrice: true, totalNumbers: true, maxPerCustomer: true } });
    if (!raffle) throw new Error("RAFFLE_NOT_FOUND");
    if (raffle.status !== RaffleStatus.OPEN) throw new Error("RAFFLE_NOT_OPEN");
    if (numbers.some((number) => number > raffle.totalNumbers)) throw new Error("RAFFLE_NUMBER_INVALID");
    if (numbers.length > raffle.maxPerCustomer) throw new Error("RAFFLE_LIMIT");
    const occupied = await transaction.raffleTicket.findMany({ where: { raffleId: raffle.id, number: { in: numbers }, status: { in: [RaffleTicketStatus.RESERVED, RaffleTicketStatus.PAID] } }, select: { number: true } });
    if (occupied.length) throw new Error("RAFFLE_NUMBERS_UNAVAILABLE");
    const previousPaid = await transaction.raffleTicket.count({ where: { raffleId: raffle.id, status: RaffleTicketStatus.PAID, order: { buyerEmail: email } } });
    const previousReserved = await transaction.raffleTicket.count({ where: { raffleId: raffle.id, status: RaffleTicketStatus.RESERVED, order: { buyerEmail: email, status: RaffleOrderStatus.PAYMENT_PENDING, expiresAt: { gt: new Date() } } } });
    if (previousPaid + previousReserved + numbers.length > raffle.maxPerCustomer) throw new Error("RAFFLE_LIMIT");
    const total = calculateRaffleTotal(Number(raffle.ticketPrice), numbers.length);
    return transaction.raffleOrder.create({
      data: {
        number: generateRaffleOrderNumber(),
        raffleId: raffle.id,
        customerId: options.customerId,
        buyerName: data.name,
        buyerEmail: email,
        buyerPhone: data.phone,
        total,
        expiresAt: new Date(Date.now() + reservationMinutes * 60 * 1000),
        tickets: { create: numbers.map((number) => ({ raffleId: raffle.id, number })) },
        payment: { create: { provider: "mercadopago", method: "pix", amount: total, status: PaymentStatus.PENDING } },
        events: { create: { status: RaffleOrderStatus.PAYMENT_PENDING, note: "Números reservados e aguardando pagamento PIX" } },
      },
      select: { id: true, number: true, total: true, expiresAt: true, raffle: { select: { title: true } }, tickets: { select: { number: true }, orderBy: { number: "asc" } } },
    });
  }).catch((error: unknown) => {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") throw new Error("RAFFLE_NUMBERS_UNAVAILABLE");
    throw error;
  });
  try {
    const gateway = await createConfiguredPaymentGateway();
    const payment = await gateway.createPayment({ orderId: order.number, amount: Number(order.total), payerEmail: email, method: "pix", description: `Rifa: ${order.raffle.title}`.slice(0, 120) });
    const savedPayment = await applyRafflePaymentResult(order.id, payment, "payment_created");
    return { number: order.number, numbers: order.tickets.map((ticket) => ticket.number), total: Number(order.total), expiresAt: order.expiresAt.toISOString(), payment: savedPayment };
  } catch (error) {
    await cancelRaffleOrder(order.id, "Pagamento PIX não pôde ser iniciado; os números foram liberados.");
    throw error;
  }
}

export async function syncRafflePaymentByExternalId(externalId: string, eventType = "payment") {
  const payment = await db.rafflePayment.findFirst({ where: { provider: "mercadopago", providerId: externalId }, select: { raffleOrderId: true } });
  if (!payment) return { matched: false, status: null as PaymentStatus | null };
  const gateway = await createConfiguredPaymentGateway();
  const result = await gateway.getPayment(externalId);
  await applyRafflePaymentResult(payment.raffleOrderId, result, eventType);
  return { matched: true, status: paymentStatus(result.status) };
}

export async function reconcilePendingRafflePayments(limit: number) {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const payments = await db.rafflePayment.findMany({ where: { provider: "mercadopago", status: PaymentStatus.PENDING, providerId: { not: null } }, select: { providerId: true }, orderBy: { updatedAt: "asc" }, take: boundedLimit });
  const results: Array<{ externalId: string; matched: boolean; status: PaymentStatus | null }> = [];
  for (const payment of payments) {
    if (!payment.providerId) continue;
    const result = await syncRafflePaymentByExternalId(payment.providerId, "manual_reconciliation");
    results.push({ externalId: payment.providerId, ...result });
  }
  return { checked: results.length, results };
}

export { maxRaffleNumbers, reservationMinutes, raffleCategorySlug };
