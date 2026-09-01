import { getUserFromRequest } from "@/server/auth/auth.service";
import { updateSellerStatus } from "@/server/admin/sellers";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    const seller = await updateSellerStatus(user, id, await request.json());
    return Response.json({ seller: { id: seller.id, status: seller.status } });
  } catch (error) { return routeError(error); }
}
