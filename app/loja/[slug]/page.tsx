import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogListing } from "@/components/marketplace/catalog-listing";
import { getCatalogStoreBySlug, listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getCatalogStoreBySlug(slug);
  return store ? { title: store.name, description: `${store.tagline}. Loja parceira da ATW Group.` } : { title: "Loja não encontrada" };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getCatalogStoreBySlug(slug);
  if (!store) notFound();
  const result = await listCatalogProducts({ storeSlug: slug, limit: 100 });

  return (
    <CatalogListing
      eyebrow={`${store.city} · ${store.rating.toFixed(1)} ★`}
      title={store.name}
      description={`${store.tagline}. Explore os produtos desta loja parceira da ATW Group.`}
      products={result.products}
      emptyTitle="Esta loja ainda está organizando a vitrine"
      emptyDescription="Os produtos desta loja serão exibidos aqui assim que o catálogo for publicado."
    />
  );
}
