# Pagamentos

O pagamento é desacoplado do checkout em `POST /api/payments`. O checkout persistido cria o pedido com pagamento pendente; a etapa seguinte resolve o pedido por número, recalcula o valor usando `Order.total` e só então chama o provedor.

O adaptador atual é Mercado Pago e usa somente o servidor:

- `MERCADOPAGO_ACCESS_TOKEN` é obrigatório e nunca deve ser exposto ao navegador;
- `POST https://api.mercadopago.com/v1/payments` recebe PIX ou cartão tokenizado;
- toda criação envia `X-Idempotency-Key` derivada do pedido;
- cartão exige token, método e parcelas; o backend não recebe número, CVV ou validade;
- a resposta pública contém somente status, identificador externo e QR Code do PIX.

Ativação: configure `DATABASE_URL`, `NEXTAUTH_SECRET` e `MERCADOPAGO_ACCESS_TOKEN`. Sem essas variáveis, a rota responde indisponibilidade e nenhum pagamento externo é simulado.

O webhook e a reconciliação periódica ainda são necessários antes de produção para confirmar alterações de status fora do fluxo síncrono, proteger contra duplicidade e recuperar falhas entre o provedor e o banco.
