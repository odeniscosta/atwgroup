import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { demoProducts } from "@/modules/catalog/catalog.data";

export const checkoutInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(30),
  address: z.string().trim().min(8).max(240),
  paymentMethod: z.enum(["pix", "card"]),
  items: z.array(z.object({ id: z.string().trim().min(1).max(80), quantity: z.number().int().min(1).max(20) })).min(1).max(50).superRefine((items, context) => {
    const ids = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (ids.has(item.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "Produto duplicado." });
      ids.add(item.id);
    }
  }),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutOptions = { userId?: string };

type PricedItem = { id: string; name: string; sku: string; sellerId: string; quantity: number; unitPrice: number };

export type CheckoutSummary = { subtotal: number; shipping: number; total: number; itemCount: number };
export type CheckoutResult = CheckoutSummary & { source: "database" | "demo"; number?: string; numbers?: string[] };

function shouldUseDemo() { return process.env.ATW_ORDER_SOURCE === "demo" || !process.env.DATABASE_URL; }
function generateOrderNumber() { return `ATW${Date.now().toString().slice(-6)}${randomBytes(3).toString("hex").toUpperCase()}`; }
function shippingFor(subtotal: number) { return subtotal >= 199 ? 0 : 19.9; }
function summarize(items: PricedItem[]): CheckoutSummary {
  const subtotal = Number(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2));
  const shipping = shippingFor(subtotal);
  return { subtotal, shipping, total: Number((subtotal + shipping).toFixed(2)), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}
function demoItems(input: CheckoutInput): PricedItem[] {
  const products = new Map(demoProducts.map((product) => [product.id, product]));
  return input.items.map((item) => {
    const product = products.get(item.id);
    if (!product) throw new Error("Um produto não está mais disponível.");
    return { id: product.id, name: product.name, sku: `ATW-${product.id}`, sellerId: product.storeSlug, quantity: item.quantity, unitPrice: product.price };
  });
}
function groupBySeller(items: PricedItem[]) { return Map.groupBy(items, (item) => item.sellerId); }

export function parseCheckoutInput(value: unknown): CheckoutInput { return checkoutInputSchema.parse(value); }

export function calculateDemoCheckout(input: CheckoutInput): CheckoutResult {
  const summary = summarize(demoItems(input));
  const number = generateOrderNumber();
  return { ...summary, source: "demo", number, numbers: [number] };
}

export async function createCheckoutOrder(input: CheckoutInput, options: CheckoutOptions = {}): Promise<CheckoutResult> {
  if (shouldUseDemo()) return calculateDemoCheckout(input);
  const products = await db.product.findMany({ where: { id: { in: input.items.map((item) => item.id) }, status: "ACTIVE", stock: { gt: 0 } } });
  if (products.length !== input.items.length) throw new Error("Um produto não está mais disponível.");
  const customer = options.userId ? await db.customer.findUnique({ where: { userId: options.userId }, select: { id: true } }) : null;
  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = input.items.map((item) => {
    const product = productMap.get(item.id);
    if (!product) throw new Error("Um produto não está mais disponível.");
    return { id: product.id, name: product.name, sku: product.sku, sellerId: product.sellerId, quantity: item.quantity, unitPrice: Number(product.promotionalPrice ?? product.price) };
  });
  const groups = groupBySeller(items);
  const orderNumbers: string[] = [];
  let totalSummary: CheckoutSummary = { subtotal: 0, shipping: 0, total: 0, itemCount: 0 };
  await db.$transaction(async (transaction) => {
    for (const sellerItems of groups.values()) {
      for (const item of sellerItems) {
        const reserved = await transaction.product.updateMany({ where: { id: item.id, status: "ACTIVE", stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
        if (reserved.count !== 1) throw new Error("OUT_OF_STOCK");
      }
      const summary = summarize(sellerItems);
      const number = generateOrderNumber();
      orderNumbers.push(number);
      totalSummary = { subtotal: Number((totalSummary.subtotal + summary.subtotal).toFixed(2)), shipping: Number((totalSummary.shipping + summary.shipping).toFixed(2)), total: Number((totalSummary.total + summary.total).toFixed(2)), itemCount: totalSummary.itemCount + summary.itemCount };
      await transaction.order.create({
        data: {
          number, customerId: customer?.id, sellerId: sellerItems[0].sellerId, subtotal: summary.subtotal, discount: 0, shipping: summary.shipping, total: summary.total,
          shippingAddress: { name: input.name, email: input.email, phone: input.phone, address: input.address }, status: "PAYMENT_PENDING",
          items: { create: sellerItems.map((item) => ({ productId: item.id, productName: item.name, sku: item.sku, quantity: item.quantity, unitPrice: item.unitPrice, total: Number((item.unitPrice * item.quantity).toFixed(2)) })) },
          payment: { create: { provider: "demo", method: input.paymentMethod, amount: summary.total, status: "PENDING" } },
          events: { create: { status: "PAYMENT_PENDING", note: "Pedido criado e aguardando pagamento" } },
        },
      });
    }
  });
  return { ...totalSummary, source: "database", number: orderNumbers[0], numbers: orderNumbers };
}
