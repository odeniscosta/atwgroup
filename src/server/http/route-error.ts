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
      IMAGE_NOT_FOUND: 404,
      IMAGE_REQUIRED: 400,
      IMAGE_LIMIT: 400,
      IMAGE_SIZE: 413,
      IMAGE_TYPE: 415,
      IMAGE_INVALID: 415,
      INVALID_STATUS_TRANSITION: 409,
      PAYMENT_NOT_CONFIGURED: 503,
      PAYMENT_DATABASE_UNAVAILABLE: 503,
      PAYMENT_SETTINGS_INVALID: 503,
      NOTIFICATION_SETTINGS_INVALID: 503,
      DATABASE_UNAVAILABLE: 503,
      AUTH_NOT_CONFIGURED: 503,
    };
    const status = statusByCode[error.message] ?? 500;
    const messageByCode: Record<string, string> = {
      IMAGE_NOT_FOUND: "Imagem não encontrada.",
      IMAGE_REQUIRED: "Selecione ao menos uma imagem.",
      IMAGE_LIMIT: "Cada produto pode ter no máximo 5 imagens.",
      IMAGE_SIZE: "Cada imagem deve ter no máximo 5 MB.",
      IMAGE_TYPE: "Use uma imagem JPG, PNG, WebP ou AVIF.",
      IMAGE_INVALID: "O arquivo enviado não corresponde a uma imagem válida.",
    };
    if (status < 500) return Response.json({ error: messageByCode[error.message] ?? error.message }, { status });
    if (error.message === "PAYMENT_NOT_CONFIGURED" || error.message === "PAYMENT_DATABASE_UNAVAILABLE") {
      return Response.json({ error: "Pagamento indisponível no momento." }, { status });
    }
    if (error.message === "NOTIFICATION_SETTINGS_INVALID") return Response.json({ error: "A configuração de notificações está inválida ou incompleta." }, { status });
    if (error.message === "AUTH_NOT_CONFIGURED") return Response.json({ error: "Autenticação indisponível no momento." }, { status });
  }
  return Response.json({ error: "Não foi possível concluir a operação." }, { status: 500 });
}
