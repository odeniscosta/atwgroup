import { getUserFromRequest } from "@/server/auth/auth.service";
import { deleteManagedCategory, updateManagedCategory } from "@/server/admin/categories";
import { routeError } from "@/server/http/route-error";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    return Response.json({ category: await updateManagedCategory(user, id, await request.json()) });
  } catch (error) { return routeError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    await deleteManagedCategory(user, id);
    return new Response(null, { status: 204 });
  } catch (error) { return routeError(error); }
}
