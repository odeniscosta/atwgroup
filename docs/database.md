# Banco de dados

O schema Prisma possui uma migration inicial em `prisma/migrations/20260813200000_init/migration.sql`.

Fluxo recomendado:

1. Defina `DATABASE_URL` apontando para PostgreSQL de desenvolvimento, homologação ou produção.
2. Gere o cliente com `npm run db:generate`.
3. Aplique migrations com `npx prisma migrate deploy`.
4. Popule o catálogo com `npx tsx prisma/seed-catalog.ts` somente em ambientes autorizados.

Não use o fallback local do `prisma.config.ts` em produção. O fallback existe apenas para permitir geração e desenvolvimento local; a aplicação só entra no modo persistido quando `DATABASE_URL` está explicitamente configurada.

Antes da publicação, faça backup, aplique a migration em homologação, valide índices e confirme que a política de retenção de `AuditLog`, `WebhookEvent` e dados de pedidos atende ao ambiente.
