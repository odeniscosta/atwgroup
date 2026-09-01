import { discountPercent } from "@/lib/format";
import { demoCategories, demoProducts, demoStores } from "@/modules/catalog/catalog.data";
import type { CatalogCategory, CatalogProduct, CatalogStore } from "@/types/catalog";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function getCategoryBySlug(slug: string): CatalogCategory | undefined {
  return demoCategories.find((category) => category.slug === slug);
}

export function getStoreBySlug(slug: string): CatalogStore | undefined {
  return demoStores.find((store) => store.slug === slug);
}

export function getProductsByCategory(slug: string): CatalogProduct[] {
  const category = getCategoryBySlug(slug);
  if (!category) return [];
  return demoProducts.filter((product) => normalize(product.category) === normalize(category.name));
}

export function getProductsByStore(slug: string): CatalogProduct[] {
  return demoProducts.filter((product) => product.storeSlug === slug);
}

export function getPromotionalProducts(): CatalogProduct[] {
  return demoProducts
    .filter((product) => Boolean(discountPercent(product.price, product.oldPrice)))
    .sort(
      (first, second) =>
        (discountPercent(second.price, second.oldPrice) ?? 0) -
        (discountPercent(first.price, first.oldPrice) ?? 0),
    );
}

export function searchProducts(query: string): CatalogProduct[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  return demoProducts.filter((product) => {
    const searchable = [product.name, product.category, product.storeName, product.storeSlug]
      .map(normalize)
      .join(" ");
    return searchable.includes(normalizedQuery);
  });
}
