import { createHmac, timingSafeEqual } from "node:crypto";

const signaturePart = /^[a-z0-9]+=[^,]+$/i;

export function verifyMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
  nowSeconds?: number;
}) {
  if (!input.signature || !input.requestId || !input.dataId || !input.secret) return false;
  const parts = input.signature.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.some((part) => !signaturePart.test(part))) return false;
  const values = new Map(parts.map((part) => { const separator = part.indexOf("="); return [part.slice(0, separator), part.slice(separator + 1)]; }));
  const timestamp = values.get("ts");
  const receivedHash = values.get("v1");
  if (!timestamp || !receivedHash || !/^\d{1,20}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(receivedHash)) return false;
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  const manifest = `id:${input.dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", input.secret).update(manifest).digest("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const received = Buffer.from(receivedHash.toLowerCase(), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
