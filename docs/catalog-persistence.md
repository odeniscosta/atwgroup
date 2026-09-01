# Persistência do catálogo

O catálogo possui dois modos:

- `demo`: dados estáticos, usado quando `DATABASE_URL` não está definida ou quando `ATW_CATALOG_SOURCE=demo`.
- `database`: PostgreSQL via Prisma, ativado quando `DATABASE_URL` está definida e o modo não foi forçado para `demo`.

## Desenvolvimento local

Com Docker disponível:

```powershell
docker compose up -d postgres redis
Copy-Item .env.example .env
npm run db:generate
npx prisma db push
$env:DATABASE_URL = "postgresql://atw:atw_dev@localhost:5432/atwgroup"
npx tsx prisma/seed-catalog.ts
```

O seed persistido corrige o modelo comercial: `price` contém o preço original e `promotionalPrice` contém o preço vigente quando há promoção.

## Supabase

Defina `DATABASE_URL` no ambiente de homologação/produção usando a URL fornecida pelo projeto Supabase. Não coloque essa URL em arquivos versionados. Gere e aplique migrations após revisar o schema:

```powershell
npx prisma migrate dev --name catalog-foundation
npx prisma migrate deploy
npx tsx prisma/seed-catalog.ts
```

O endpoint público `GET /api/catalog` retorna somente o DTO comercial do catálogo e não expõe registros internos, credenciais ou dados de vendedores.
