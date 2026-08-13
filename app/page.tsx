import { HomePage } from "@/components/marketplace/home-page";
import { demoCategories, demoProducts, demoStores } from "@/modules/catalog/catalog.data";

export default function Home() {
  return (
    <HomePage
      categories={demoCategories}
      products={demoProducts}
      stores={demoStores}
    />
  );
}
