import { getUserFromRequest } from "@/server/auth/auth.service";
import { createRaffleOrder, raffleOrderInputSchema } from "@/server/raffles";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const input = raffleOrderInputSchema.parse(await request.json());
    let customerId: string | undefined;
    try {
      customerId = (await getUserFromRequest(request))?.id;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "AUTH_NOT_CONFIGURED") throw error;
    }
    return Response.json({ order: await createRaffleOrder(slug, input, { customerId }) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
