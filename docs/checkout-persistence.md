# Checkout persistido

O endpoint `POST /api/checkout` valida os dados recebidos e recalcula preços exclusivamente a partir do catálogo confiável.

Quando `DATABASE_URL` não está configurada, o endpoint opera em modo demo e retorna um número de pedido de apresentação. Com PostgreSQL configurado, cria uma ordem por vendedor dentro de uma transação Prisma e associa o pedido ao cliente autenticado quando houver sessão.

O cliente nunca define preço, frete, total, vendedor ou SKU. Esses dados são resolvidos no servidor. O pagamento persistido começa pendente e pode ser processado depois por `POST /api/payments`, conforme [payments.md](./payments.md).
