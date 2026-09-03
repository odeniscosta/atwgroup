import { listPublicRaffles } from "@/server/raffles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ raffles: await listPublicRaffles() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public raffles failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Não foi possível consultar as rifas." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
