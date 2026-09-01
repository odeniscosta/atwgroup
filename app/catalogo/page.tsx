import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

export default async function PersistedCatalogPage() {
  const result = await listCatalogProducts({ limit: 24 });

  return (
    <CatalogListing
      eyebrow={result.source === "database" ? "Catálogo conectado" : "Catálogo demonstrativo"}
      title="Tudo que você procura, em um só lugar."
      description={result.source === "database" ? "Produtos publicados no catálogo persistido da ATW Group." : "A vitrine está funcionando em modo demo enquanto o PostgreSQL não está configurado."}
      products={result.products}
      emptyTitle="O catálogo está vazio"
      emptyDescription="Publique produtos no painel ou execute o seed do catálogo para preencher esta vitrine."
    />
  );
}
