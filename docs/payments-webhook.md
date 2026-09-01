# Pagamentos, webhook e reconciliação

O checkout cria o pedido e, em ambiente persistente, gera o PIX pelo Mercado Pago através do servidor. Nenhum segredo ou número bruto de cartão é recebido pelo frontend.

## Variáveis

- `MERCADOPAGO_ACCESS_TOKEN`: token privado, somente no servidor.
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo usado para validar `x-signature`.

Configure o webhook Mercado Pago para `POST /api/payments/webhook`. A aplicação valida o manifesto oficial com `data.id`, `x-request-id` e `ts`, aplica HMAC-SHA256 em comparação de tempo constante e rejeita assinaturas ausentes, inválidas ou expiradas.

Eventos são deduplicados por provedor, pagamento e tipo. O processamento consulta o pagamento no provedor e atualiza `Payment`, `PaymentTransaction`, `Order` e `OrderEvent` sem armazenar o payload completo.

## Reconciliação manual

Um administrador pode executar `POST /api/payments/reconcile` com `{ "limit": 50 }`. O limite aceito é de 1 a 100 pagamentos pendentes. A rota exige sessão `ADMIN`.

Cartão ainda exige integração de tokenização pública do provedor antes de ser habilitado no checkout. A tela bloqueia o envio sem token e nunca coleta número, validade ou código de segurança.
