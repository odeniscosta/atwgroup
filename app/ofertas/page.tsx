import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { getPromotionalProducts } from "@/modules/catalog/catalog.selectors";

export default function OffersPage() {
  return (
    <CatalogListing
      eyebrow="Preço bom é aqui"
      title="Ofertas do dia"
      description="Produtos selecionados com desconto para aproveitar agora, enquanto durar o estoque demonstrativo."
      products={getPromotionalProducts()}
      emptyTitle="As ofertas estão chegando"
      emptyDescription="Ainda não há produtos promocionais cadastrados nesta vitrine."
    />
  );
}
