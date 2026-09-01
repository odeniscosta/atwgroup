import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { getProductsByStore, getStoreBySlug } from "@/modules/catalog/catalog.selectors";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = getStoreBySlug(slug);
  return store ? { title: store.name, description: `${store.tagline}. Loja parceira da ATW Group.` } : { title: "Loja não encontrada" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = getStoreBySlug(slug);
  if (!store) notFound();

  return (
    <CatalogListing
      eyebrow={`${store.city} · ${store.rating.toFixed(1)} ★`}
      title={store.name}
      description={`${store.tagline}. Explore os produtos desta loja parceira da ATW Group.`}
      products={getProductsByStore(store.slug)}
      emptyTitle="Esta loja ainda está organizando a vitrine"
      emptyDescription="Os produtos desta loja serão exibidos aqui assim que o catálogo for publicado."
    />
  );
}
