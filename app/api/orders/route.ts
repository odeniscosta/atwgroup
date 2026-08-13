import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const orderSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().trim().min(8).max(30),
  address: z.string().trim().min(8).max(240),
  paymentMethod: z.enum(["pix", "card"]),
  items: z.array(z.object({ id: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const input = orderSchema.parse(await request.json());
    const validItems = input.items.filter((item) => item.id.startsWith("p-"));
    if (!validItems.length) return NextResponse.json({ error: "Carrinho inválido." }, { status: 400 });

    const productIds = validItems.map((item) => item.id);
    const products = await db.product.findMany({ where: { id: { in: productIds }, status: "ACTIVE" } });
    if (products.length !== validItems.length) return NextResponse.json({ error: "Um produto não está mais disponível." }, { status: 409 });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const subtotal = validItems.reduce((sum, item) => {
      const product = productMap.get(item.id);
      return sum + Number(product?.promotionalPrice ?? product?.price ?? 0) * item.quantity;
    }, 0);
    const shipping = subtotal >= 199 ? 0 : 19.9;
    const number = `ATW${Date.now().toString().slice(-8)}`;
    const sellerId = products[0].sellerId;

    await db.order.create({
      data: {
        number,
        sellerId,
        subtotal,
        discount: 0,
        shipping,
        total: subtotal + shipping,
        shippingAddress: { name: input.name, email: input.email, phone: input.phone, address: input.address },
        status: "PAYMENT_PENDING",
        items: {
          create: validItems.map((item) => {
            const product = productMap.get(item.id)!;
            const unitPrice = Number(product.promotionalPrice ?? product.price);
            return { productId: product.id, productName: product.name, sku: product.sku, quantity: item.quantity, unitPrice, total: unitPrice * item.quantity };
          }),
        },
        payment: { create: { provider: "demo", method: input.paymentMethod, amount: subtotal + shipping, status: "PENDING" } },
        events: { create: { status: "PAYMENT_PENDING", note: "Pedido criado no ambiente de demonstração" } },
      },
    });

    return NextResponse.json({ number, status: "PAYMENT_PENDING" }, { status: 201 });
  } catch (error) {
    console.error("order creation failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Revise os dados informados." }, { status: 400 });
  }
}