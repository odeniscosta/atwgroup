import { getUserFromRequest } from "@/server/auth/auth.service";
import { deleteManagedProductImage } from "@/server/admin/product-images";
import { routeError } from "@/server/http/route-error";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id, imageId } = await context.params;
    await deleteManagedProductImage(user, id, imageId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
