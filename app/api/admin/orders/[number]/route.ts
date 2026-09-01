import { getUserFromRequest } from "@/server/auth/auth.service";
import { updateManagedOrder } from "@/server/orders/management";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ number: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { number } = await context.params;
    return Response.json({ order: await updateManagedOrder(user, number, await request.json()) });
  } catch (error) { return routeError(error); }
}
