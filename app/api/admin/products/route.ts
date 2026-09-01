import { getUserFromRequest } from "@/server/auth/auth.service";
import { createManagedProduct, listManagedProducts } from "@/server/admin/catalog";
import { routeError } from "@/server/http/route-error";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ products: await listManagedProducts(user) });
  } catch (error) { return routeError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    return Response.json({ product: await createManagedProduct(user, await request.json()) }, { status: 201 });
  } catch (error) { return routeError(error); }
}
