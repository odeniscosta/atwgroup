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
      RAFFLE_NOT_FOUND: 404,
      RAFFLE_PAYMENT_NOT_FOUND: 404,
      CONFLICT: 409,
      PRODUCT_CONFLICT: 409,
      CATEGORY_CONFLICT: 409,
      RAFFLE_CONFLICT: 409,
      RAFFLE_OPEN_IMMUTABLE: 409,
      RAFFLE_IMMUTABLE: 409,
      RAFFLE_NUMBER_RANGE: 409,
      RAFFLE_CATEGORY_PROTECTED: 409,
      RAFFLE_DRAW_REQUIRED: 409,
      RAFFLE_DRAW_UNAVAILABLE: 409,
      RAFFLE_DRAW_TOO_EARLY: 409,
      RAFFLE_ALREADY_DRAWN: 409,
      INVALID_RAFFLE_STATUS_TRANSITION: 409,
      RAFFLE_NUMBERS_UNAVAILABLE: 409,
      RAFFLE_LIMIT: 409,
      RAFFLE_NOT_OPEN: 409,
      RAFFLE_NUMBER_INVALID: 400,
      INVALID_RAFFLE_FILTER: 400,
      RAFFLE_NO_PAID_TICKETS: 409,
      OUT_OF_STOCK: 409,
      IMAGE_NOT_FOUND: 404,
      IMAGE_REQUIRED: 400,
      IMAGE_LIMIT: 400,
      IMAGE_SIZE: 413,
      IMAGE_TYPE: 415,
      IMAGE_INVALID: 415,
      PAYMENT_PROVIDER_ERROR: 502,
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
      RAFFLE_NOT_FOUND: "Rifa não encontrada.",
      RAFFLE_PAYMENT_NOT_FOUND: "Pagamento da rifa não encontrado.",
      RAFFLE_CONFLICT: "Já existe uma rifa com este slug.",
      IMAGE_NOT_FOUND: "Imagem não encontrada.",
      IMAGE_REQUIRED: "Selecione ao menos uma imagem.",
      IMAGE_LIMIT: "Cada produto pode ter no máximo 5 imagens.",
      IMAGE_SIZE: "Cada imagem deve ter no máximo 5 MB.",
      IMAGE_TYPE: "Use uma imagem JPG, PNG, WebP ou AVIF.",
      IMAGE_INVALID: "O arquivo enviado não corresponde a uma imagem válida.",
      RAFFLE_NUMBERS_UNAVAILABLE: "Um ou mais números acabaram de ser reservados. Escolha outros números.",
      RAFFLE_LIMIT: "Você atingiu o limite de números permitido para esta rifa.",
      RAFFLE_NOT_OPEN: "Esta rifa não está aberta para novas reservas.",
      RAFFLE_NUMBER_INVALID: "Escolha apenas números válidos desta rifa.",
      RAFFLE_NO_PAID_TICKETS: "A rifa precisa ter ao menos um número pago para realizar o sorteio.",
      RAFFLE_DRAW_UNAVAILABLE: "Este sorteio não pode mais ser realizado neste estado.",
      RAFFLE_DRAW_TOO_EARLY: "A data programada para o sorteio ainda não chegou.",
      INVALID_RAFFLE_STATUS_TRANSITION: "A mudança de status da rifa não é permitida.",
      RAFFLE_DRAW_REQUIRED: "Use a ação de sorteio para concluir uma rifa.",
      RAFFLE_OPEN_IMMUTABLE: "Preço e quantidade não podem ser alterados enquanto a rifa está aberta.",
      RAFFLE_IMMUTABLE: "Esta rifa já foi encerrada e não pode ser editada.",
      RAFFLE_NUMBER_RANGE: "A quantidade de números não pode excluir números já reservados ou pagos.",
      RAFFLE_CATEGORY_PROTECTED: "A categoria Rifas é protegida para manter a separação das campanhas.",
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
