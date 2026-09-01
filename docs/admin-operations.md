# Operações administrativas

## Acesso

- `/admin`: `ADMIN` e `MANAGER`.
- `/vendedor`: `SELLER` aprovado.
- As páginas são apenas a interface. Cada rota API repete a autorização no servidor.

## Catálogo

O painel permite criar, editar e arquivar produtos, cadastrar categorias e manter uma imagem principal HTTPS. O servidor recalcula e valida preços, slug, SKU, categoria e estoque.

Vendedores só operam os próprios produtos e não podem publicar diretamente como `ACTIVE`; o produto fica `PENDING_REVIEW`. A aprovação de vendedores é exclusiva de `ADMIN`.

## Estoque

O checkout reserva estoque com atualização condicional dentro da transação. Se a quantidade não estiver disponível, o pedido falha sem criar registros parciais. O cancelamento de um pedido ainda em pagamento devolve a reserva.

## Pedidos

Administradores e gerentes podem avançar pedidos respeitando transições válidas. Vendedores só podem atualizar os próprios pedidos nas etapas `PROCESSING`, `SHIPPED` e `DELIVERED`.
