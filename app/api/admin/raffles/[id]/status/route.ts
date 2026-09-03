import { getUserFromRequest } from "@/server/auth/auth.service";
import { updateManagedRaffleStatus } from "@/server/raffles";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    return Response.json({ raffle: await updateManagedRaffleStatus(user, id, await request.json()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
