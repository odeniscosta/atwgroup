import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { PaymentStatus, OrderStatus } from "@/generated/prisma/enums";
import { reconcilePendingRafflePayments, syncRafflePaymentByExternalId } from "@/server/raffles";
import { createConfiguredPaymentGateway, type PaymentResult } from "@/services/payments/payment-gateway";

function paymentStatus(status: PaymentResult["status"]) {
  if (status === "approved") return PaymentStatus.APPROVED;
  if (status === "cancelled") return PaymentStatus.CANCELLED;
  if (status === "refunded") return PaymentStatus.REFUNDED;
  if (status === "rejected") return PaymentStatus.REJECTED;
  return PaymentStatus.PENDING;
}

async function syncRegularPaymentByExternalId(externalId: string, eventType = "payment") {
  const payment = await db.payment.findFirst({ where: { provider: "mercadopago", providerId: externalId }, select: { id: true } });
  if (!payment) return { matched: false, status: null as PaymentStatus | null };
  const gateway = await createConfiguredPaymentGateway();
  const result = await gateway.getPayment(externalId);
  const status = paymentStatus(result.status);
  await db.$transaction(async (transaction) => {
    const current = await transaction.payment.findUnique({ where: { id: payment.id }, select: { id: true, orderId: true, status: true, amount: true } });
    if (!current) return;
    await transaction.payment.update({ where: { id: payment.id }, data: { status, providerId: result.externalId } });
    await transaction.paymentTransaction.upsert({
      where: { paymentId_externalId: { paymentId: payment.id, externalId: result.externalId } },
      update: { status, rawEvent: { type: eventType, provider: "mercadopago" } },
      create: { paymentId: payment.id, externalId: result.externalId, status, rawEvent: { type: eventType, provider: "mercadopago" } },
    });
    if (status === PaymentStatus.APPROVED) {
      const order = await transaction.order.findUnique({ where: { id: current.orderId }, select: { id: true, status: true } });
      if (order && (order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.PAYMENT_PENDING)) {
        await transaction.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID } });
        await transaction.orderEvent.create({ data: { orderId: order.id, status: OrderStatus.PAID, note: "Pagamento confirmado pelo webhook do provedor" } });
      }
    } else if (status === PaymentStatus.REJECTED || status === PaymentStatus.CANCELLED) {
      const order = await transaction.order.findUnique({ where: { id: current.orderId }, select: { id: true, status: true } });
      if (order && (order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.PAYMENT_PENDING)) {
        await transaction.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
        const items = await transaction.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, quantity: true } });
        for (const item of items) await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await transaction.orderEvent.create({ data: { orderId: order.id, status: OrderStatus.CANCELLED, note: "Pedido cancelado após rejeição do pagamento" } });
      }
    }
  });
  return { matched: true, status };
}

export async function syncPaymentByExternalId(externalId: string, eventType = "payment") {
  const regularPayment = await db.payment.findFirst({ where: { provider: "mercadopago", providerId: externalId }, select: { id: true } });
  if (regularPayment) return syncRegularPaymentByExternalId(externalId, eventType);
  return syncRafflePaymentByExternalId(externalId, eventType);
}

export async function reconcilePendingPayments(limit: number) {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const payments = await db.payment.findMany({ where: { provider: "mercadopago", status: PaymentStatus.PENDING, providerId: { not: null } }, select: { providerId: true }, orderBy: { updatedAt: "asc" }, take: boundedLimit });
  const results: Array<{ externalId: string; matched: boolean; status: PaymentStatus | null }> = [];
  for (const payment of payments) {
    if (!payment.providerId) continue;
    const result = await syncPaymentByExternalId(payment.providerId, "manual_reconciliation");
    results.push({ externalId: payment.providerId, ...result });
  }
  const raffleResult = await reconcilePendingRafflePayments(limit);
  return { checked: results.length + raffleResult.checked, results: [...results, ...raffleResult.results] };
}

export const reconcileInputSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) });

export function webhookPayloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}
