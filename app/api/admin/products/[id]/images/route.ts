import { getUserFromRequest } from "@/server/auth/auth.service";
import { uploadManagedProductImages } from "@/server/admin/product-images";
import { routeError } from "@/server/http/route-error";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new Error("UNAUTHENTICATED");
    const { id } = await context.params;
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    return Response.json({ images: await uploadManagedProductImages(user, id, files) });
  } catch (error) {
    return routeError(error);
  }
}
