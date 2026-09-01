import { getUserFromRequest } from "@/server/auth/auth.service";
import { listManagedSellers } from "@/server/admin/sellers";
import { routeError } from "@/server/http/route-error";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const sellers = await listManagedSellers(user);
    return Response.json({ sellers: sellers.map((seller) => ({ ...seller, commissionRate: Number(seller.commissionRate), createdAt: seller.createdAt.toISOString() })) });
  } catch (error) { return routeError(error); }
}
