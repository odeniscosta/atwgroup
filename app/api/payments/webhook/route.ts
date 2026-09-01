import { db } from "@/lib/db";
import { routeError } from "@/server/http/route-error";
import { syncPaymentByExternalId, webhookPayloadHash } from "@/server/payments/reconciliation";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook";

function validExternalId(value: string | null): value is string { return Boolean(value && /^[A-Za-z0-9_-]{1,120}$/.test(value)); }

export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook não configurado." }, { status: 503 });
  const rawBody = await request.text();
  if (rawBody.length > 64_000) return Response.json({ error: "Payload muito grande." }, { status: 413 });
  let payload: { type?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  try { payload = rawBody ? JSON.parse(rawBody) as typeof payload : {}; } catch { return Response.json({ error: "Payload inválido." }, { status: 400 }); }
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? (typeof payload.data?.id === "string" ? payload.data.id : null);
  const requestId = request.headers.get("x-request-id");
  if (!validExternalId(dataId) || !verifyMercadoPagoSignature({ signature: request.headers.get("x-signature"), requestId, dataId, secret })) return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  const eventType = typeof payload.action === "string" ? payload.action.slice(0, 80) : typeof payload.type === "string" ? payload.type.slice(0, 80) : "payment";
  const externalEventId = `${dataId}:${eventType}`;
  try {
    const event = await db.webhookEvent.upsert({ where: { provider_externalId: { provider: "mercadopago", externalId: externalEventId } }, update: { payloadHash: webhookPayloadHash(rawBody) }, create: { provider: "mercadopago", externalId: externalEventId, eventType, payloadHash: webhookPayloadHash(rawBody) } });
    if (event.processedAt) return Response.json({ received: true, duplicate: true });
    const result = await syncPaymentByExternalId(dataId, eventType);
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return Response.json({ received: true, ...result });
  } catch (error) { return routeError(error); }
}
