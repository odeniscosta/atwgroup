# Acompanhamento de pedidos

A página `/acompanhar-pedido` consulta `POST /api/orders/track` usando número(s) do pedido e o e-mail informado no checkout.

No banco, a API busca as referências, compara o e-mail armazenado em `shippingAddress` e retorna somente número, status, total, data e eventos de status. Dados de endereço, itens, vendedor e informações internas não são retornados.

Quando `DATABASE_URL` não está configurada, o endpoint responde `503`, pois o modo demo não persiste pedidos e não pode oferecer rastreamento falso. Rate limiting por IP e observabilidade específica devem ser adicionados antes da exposição pública em produção.
