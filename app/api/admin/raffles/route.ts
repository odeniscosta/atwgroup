import { getUserFromRequest } from "@/server/auth/auth.service";
import { createManagedRaffle, listManagedRaffles } from "@/server/raffles";
import { routeError } from "@/server/http/route-error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ raffles: await listManagedRaffles(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ raffle: await createManagedRaffle(user, await request.json()) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
