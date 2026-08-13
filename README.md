# ATW Group

Marketplace multivendedor da ATW Group — "Seu shopping, onde você estiver."

## Fase 1 entregue

- Next.js 16, React 19, TypeScript strict, App Router e Tailwind CSS.
- Home mobile first com catálogo de demonstração, categorias, ofertas, lojas, benefícios e captação de newsletter.
- Carrinho local persistido em localStorage, busca com navegação e navegação inferior mobile.
- Identidade ATW em preto, laranja e tons neutros, com layout orientado à conversão.
- Modelo Prisma/PostgreSQL modular para usuários, vendedores, lojas, catálogo, pedidos, pagamentos, comissões, avaliações, cupons futuros, eventos e auditoria.
- Contratos desacoplados para Mercado Pago, Evolution API e n8n.
- Docker Compose para PostgreSQL e Redis.
- Manifesto PWA inicial e metadados SEO base.

## Arquitetura

app/ contém rotas e composição de páginas. src/components contém UI reutilizável. src/modules organiza domínios de negócio, começando pelo catálogo. src/services concentra integrações externas. src/lib concentra infraestrutura transversal, como banco e formatação. prisma/ contém o modelo relacional.

O checkout e pagamentos ainda não são simulados na Fase 1. A implementação do Mercado Pago deve ser feita na Fase 6 usando a documentação e SDKs oficiais vigentes, sem inventar endpoints.

## Desenvolvimento

1. Copie .env.example para .env.
2. Instale dependências com npm ci.
3. Suba infraestrutura local com docker compose up -d.
4. Gere o client Prisma com npm run db:generate.
5. Aplique o schema com npm run db:push.
6. Inicie com npm run dev.

Abra http://localhost:3000.

## Validação

    npm run lint
    npm run typecheck
    npm test
    npm run build

## Segurança

Segredos são lidos por variáveis de ambiente e não devem ser commitados. O preço do frontend nunca deve ser usado para finalizar pedidos; o backend deverá recalcular catálogo, descontos, frete, cupom e comissão nas fases de checkout.
