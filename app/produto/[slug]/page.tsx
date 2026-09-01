import { notFound } from "next/navigation";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { getCatalogProductBySlug } from "@/modules/catalog/catalog.repository";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCatalogProductBySlug(slug);
  if (!result.product) notFound();
  return <MarketplaceShell><ProductDetail product={result.product} /></MarketplaceShell>;
}
