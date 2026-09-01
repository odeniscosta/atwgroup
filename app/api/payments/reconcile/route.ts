import { getUserFromRequest } from "@/server/auth/auth.service";
import { routeError } from "@/server/http/route-error";
import { reconcileInputSchema, reconcilePendingPayments } from "@/server/payments/reconciliation";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user || user.role !== "ADMIN") throw new Error(user ? "FORBIDDEN" : "UNAUTHENTICATED");
    const input = reconcileInputSchema.parse(await request.json().catch(() => ({})));
    return Response.json(await reconcilePendingPayments(input.limit));
  } catch (error) { return routeError(error); }
}
