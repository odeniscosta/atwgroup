import { getUserFromRequest } from "@/server/auth/auth.service";
import { drawManagedRaffle } from "@/server/raffles";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    return Response.json({ result: await drawManagedRaffle(user, id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return routeError(error);
  }
}
