# Integração do checkout

O checkout visual existente continua chamando `POST /api/orders`. O `proxy.ts` mantém esse contrato legado e reescreve somente requisições `POST /api/orders` para `POST /api/checkout`, onde estão a validação e o recálculo confiáveis.

Essa compatibilidade evita duplicar a UI durante a migração. Para carrinhos de um vendedor, o fluxo existente recebe o número correto. Para carrinhos multivendedor, a API cria uma ordem por vendedor e a tela atual exibe apenas o primeiro número; a próxima etapa de UX deve apresentar a lista completa de pedidos.
