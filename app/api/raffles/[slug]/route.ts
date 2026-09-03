import { getPublicRaffleBySlug } from "@/server/raffles";

type Context = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  const raffle = await getPublicRaffleBySlug(slug);
  if (!raffle) return Response.json({ error: "Rifa não encontrada." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json({ raffle }, { headers: { "Cache-Control": "no-store" } });
}
