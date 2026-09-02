import { HomePage } from "@/components/marketplace/home-page";
import { demoCategories, demoProducts, demoStores } from "@/modules/catalog/catalog.data";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await listCatalogProducts({ limit: 100 });

  return (
    <HomePage
      categories={demoCategories}
      products={result.source === "database" ? result.products : demoProducts}
      stores={demoStores}
    />
  );
}
