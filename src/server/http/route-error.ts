import { z } from "zod";

export function routeError(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json({ error: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }
  if (error instanceof Error) {
    const statusByCode: Record<string, number> = {
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      ORDER_NOT_FOUND: 404,
      PRODUCT_NOT_FOUND: 404,
      CATEGORY_NOT_FOUND: 404,
      SELLER_NOT_FOUND: 404,
      CONFLICT: 409,
      PRODUCT_CONFLICT: 409,
      CATEGORY_CONFLICT: 409,
      OUT_OF_STOCK: 409,
      INVALID_STATUS_TRANSITION: 409,
      PAYMENT_NOT_CONFIGURED: 503,
      PAYMENT_DATABASE_UNAVAILABLE: 503,
      DATABASE_UNAVAILABLE: 503,
      AUTH_NOT_CONFIGURED: 503,
    };
    const status = statusByCode[error.message] ?? 500;
    if (status < 500) return Response.json({ error: error.message }, { status });
    if (error.message === "PAYMENT_NOT_CONFIGURED" || error.message === "PAYMENT_DATABASE_UNAVAILABLE") {
      return Response.json({ error: "Pagamento indisponível no momento." }, { status });
    }
    if (error.message === "AUTH_NOT_CONFIGURED") return Response.json({ error: "Autenticação indisponível no momento." }, { status });
  }
  return Response.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
}
