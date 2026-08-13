export type AutomationEvent =
  | "customer.created"
  | "seller.created"
  | "seller.approved"
  | "product.created"
  | "product.low_stock"
  | "cart.abandoned"
  | "order.created"
  | "payment.pending"
  | "payment.approved"
  | "payment.failed"
  | "order.shipped"
  | "order.delivered"
  | "review.created"
  | "wishlist.price_drop"
  | "product.back_in_stock";

export async function emitAutomationEvent(event: AutomationEvent, payload: Record<string, unknown>) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return { delivered: false, reason: "not_configured" as const };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-ATW-Event": event },
    body: JSON.stringify({ event, payload, occurredAt: new Date().toISOString() }),
  });

  if (!response.ok) throw new Error("n8n webhook request failed");
  return { delivered: true as const };
}
