import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

function readQuery(value: string | string[] | undefined) {
  const query = Array.isArray(value) ? value[0] : value;
  return (query ?? "").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const query = readQuery((await searchParams).q);
  const result = query ? await listCatalogProducts({ search: query, limit: 24 }) : { products: [] };
  const products = result.products;

  return (
    <CatalogListing
      eyebrow="Busca ATW"
      title={query ? `Resultados para “${query}”` : "O que você procura?"}
      description={query ? "Encontramos produtos e lojas relacionados à sua busca." : "Digite um produto, categoria ou loja na busca para começar a explorar."}
      products={products}
      emptyTitle={query ? "Nada por aqui ainda" : "Faça uma busca para começar"}
      emptyDescription={query ? "Tente usar termos mais gerais ou explore diretamente nossas categorias." : "Use a busca no topo da página para encontrar produtos do catálogo demonstrativo."}
    />
  );
}
