import { z } from "zod";
import { db } from "@/lib/db";
import { PaymentStatus } from "@/generated/prisma/enums";
import { getUserFromRequest } from "@/server/auth/auth.service";
import { createConfiguredPaymentGateway } from "@/services/payments/payment-gateway";

const cardSchema = z.object({
  token: z.string().trim().min(8).max(300),
  installments: z.number().int().min(1).max(24),
  paymentMethodId: z.string().trim().min(2).max(80),
  issuerId: z.string().trim().max(80).optional(),
});

export const paymentInputSchema = z.object({
  orderNumber: z.string().trim().min(4).max(80).regex(/^[A-Za-z0-9_-]+$/),
  payerEmail: z.string().trim().email().max(160),
  method: z.enum(["pix", "card"]),
  card: cardSchema.optional(),
}).superRefine((value, context) => {
  if (value.method === "card" && !value.card) context.addIssue({ code: "custom", path: ["card"], message: "Dados de cartão são obrigatórios." });
  if (value.method === "pix" && value.card) context.addIssue({ code: "custom", path: ["card"], message: "Dados de cartão não são aceitos para PIX." });
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

function normalizedEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function shippingEmail(value: unknown) {
  if (!value || typeof value !== "object" || !("email" in value)) return "";
  const email = (value as { email?: unknown }).email;
  return typeof email === "string" ? normalizedEmail(email) : "";
}

function providerStatus(status: "pending" | "approved" | "rejected"): PaymentStatus {
  if (status === "approved") return PaymentStatus.APPROVED;
  if (status === "rejected") return PaymentStatus.REJECTED;
  return PaymentStatus.PENDING;
}

export async function createOrderPayment(request: Request, input: PaymentInput) {
  if (!process.env.DATABASE_URL) throw new Error("PAYMENT_DATABASE_UNAVAILABLE");
  const user = await getUserFromRequest(request);
  const order = await db.order.findUnique({
    where: { number: input.orderNumber },
    select: { id: true, number: true, total: true, shippingAddress: true, customer: { select: { userId: true } }, payment: { select: { id: true, provider: true, providerId: true, status: true } } },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const authorizedByAccount = Boolean(user && order.customer?.userId === user.id);
  const authorizedByGuestEmail = !user && shippingEmail(order.shippingAddress) === normalizedEmail(input.payerEmail);
  if (!authorizedByAccount && !authorizedByGuestEmail) throw new Error("ORDER_FORBIDDEN");
  if (order.payment?.status === PaymentStatus.APPROVED) throw new Error("PAYMENT_ALREADY_APPROVED");

  const gateway = await createConfiguredPaymentGateway();
  const result = await gateway.createPayment({
    orderId: order.number,
    amount: Number(order.total),
    payerEmail: normalizedEmail(input.payerEmail),
    method: input.method,
    card: input.card,
  });
  const status = providerStatus(result.status);
  await db.$transaction(async (transaction) => {
    const payment = order.payment
      ? await transaction.payment.update({ where: { id: order.payment.id }, data: { provider: result.provider, providerId: result.externalId, status, method: input.method, amount: Number(order.total) } })
      : await transaction.payment.create({ data: { orderId: order.id, provider: result.provider, providerId: result.externalId, status, method: input.method, amount: Number(order.total) } });
    await transaction.paymentTransaction.upsert({ where: { paymentId_externalId: { paymentId: payment.id, externalId: result.externalId } }, update: { status }, create: { paymentId: payment.id, externalId: result.externalId, status } });
    if (status === PaymentStatus.APPROVED) {
      await transaction.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await transaction.orderEvent.create({ data: { orderId: order.id, status: "PAID", note: "Pagamento aprovado pelo provedor" } });
    } else if (status === PaymentStatus.REJECTED) {
      const currentOrder = await transaction.order.findUnique({ where: { id: order.id }, select: { status: true } });
      if (currentOrder && (currentOrder.status === "AWAITING_PAYMENT" || currentOrder.status === "PAYMENT_PENDING")) {
        await transaction.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        const items = await transaction.orderItem.findMany({ where: { orderId: order.id }, select: { productId: true, quantity: true } });
        for (const item of items) await transaction.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await transaction.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: "Pedido cancelado após rejeição do pagamento" } });
      }
    }
  });
  return { provider: result.provider, externalId: result.externalId, status: result.status, qrCode: result.qrCode, qrCodeBase64: result.qrCodeBase64 };
}
