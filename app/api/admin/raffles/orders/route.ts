import { getUserFromRequest } from "@/server/auth/auth.service";
import { listManagedRaffleOrders } from "@/server/raffles";
import { routeError } from "@/server/http/route-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const raffleId = new URL(request.url).searchParams.get("raffleId")?.trim() || undefined;
    if (raffleId && raffleId.length > 80) throw new Error("INVALID_RAFFLE_FILTER");
    return Response.json({ orders: await listManagedRaffleOrders(user, raffleId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
