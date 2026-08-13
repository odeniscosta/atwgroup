import { notFound } from "next/navigation";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { ProductDetail } from "@/components/marketplace/product-detail";
import { demoProducts } from "@/modules/catalog/catalog.data";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = demoProducts.find((item) => item.slug === slug);
  if (!product) notFound();
  return <MarketplaceShell><ProductDetail product={product} /></MarketplaceShell>;
}
