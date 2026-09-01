import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { getCategoryBySlug, getProductsByCategory } from "@/modules/catalog/catalog.selectors";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return category ? { title: category.name, description: `${category.eyebrow} na ATW Group.` } : { title: "Categoria não encontrada" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <CatalogListing
      eyebrow={category.eyebrow}
      title={category.name}
      description={`Descubra produtos de ${category.name.toLocaleLowerCase("pt-BR")} selecionados para você comprar com praticidade.`}
      products={getProductsByCategory(category.slug)}
    />
  );
}
