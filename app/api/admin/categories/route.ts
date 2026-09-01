import { getUserFromRequest } from "@/server/auth/auth.service";
import { createManagedCategory, listManagedCategories } from "@/server/admin/categories";
import { routeError } from "@/server/http/route-error";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ categories: await listManagedCategories(user) });
  } catch (error) { return routeError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ category: await createManagedCategory(user, await request.json()) }, { status: 201 });
  } catch (error) { return routeError(error); }
}
