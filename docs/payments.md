# Pagamentos

O pagamento é desacoplado do checkout em `POST /api/payments`. O checkout persistido cria o pedido com pagamento pendente; a etapa seguinte resolve o pedido por número, recalcula o valor usando `Order.total` e só então chama o provedor.

O adaptador atual é Mercado Pago e usa somente o servidor:

- `MERCADOPAGO_ACCESS_TOKEN` é usado como fallback quando não há token salvo no painel e nunca deve ser exposto ao navegador;
- `POST https://api.mercadopago.com/v1/payments` recebe PIX ou cartão tokenizado;
- toda criação envia `X-Idempotency-Key` derivada do pedido;
- cartão exige token, método e parcelas; o backend não recebe número, CVV ou validade;
- a resposta pública contém somente status, identificador externo e QR Code do PIX.

Ativação: o administrador pode abrir `/admin/configuracoes` e salvar Access Token, Public Key e Webhook Secret. Os valores salvos são criptografados no banco com uma chave derivada de `NEXTAUTH_SECRET`; os valores atuais nunca são devolvidos em texto puro. Para provisionamento inicial, as variáveis `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` e `MERCADOPAGO_WEBHOOK_SECRET` continuam aceitas como fallback. Sem `DATABASE_URL` e `NEXTAUTH_SECRET`, a administração responde indisponibilidade e nenhum pagamento externo é simulado.

O botão de teste chama `GET https://api.mercadopago.com/users/me` com o Access Token informado ou salvo. A configuração só fica marcada como validada depois de uma resposta bem-sucedida da API.

O webhook e a reconciliação periódica ainda são necessários antes de produção para confirmar alterações de status fora do fluxo síncrono, proteger contra duplicidade e recuperar falhas entre o provedor e o banco.
