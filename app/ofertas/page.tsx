import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const result = await listCatalogProducts({ promotionsOnly: true, limit: 100 });

  return (
    <CatalogListing
      eyebrow="Preço bom é aqui"
      title="Ofertas do dia"
      description="Produtos selecionados com desconto para aproveitar agora, enquanto durar o estoque demonstrativo."
      products={result.products}
      emptyTitle="As ofertas estão chegando"
      emptyDescription="Ainda não há produtos promocionais cadastrados nesta vitrine."
    />
  );
}
