import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { demoCategories, demoProducts } from "@/modules/catalog/catalog.data";
import type { CatalogProduct } from "@/types/catalog";

const catalogInclude = {
  category: true,
  images: { orderBy: { position: "asc" }, take: 1 },
  reviews: { select: { rating: true } },
  seller: { include: { store: true } },
} satisfies Prisma.ProductInclude;

type PersistedProduct = Prisma.ProductGetPayload<{ include: typeof catalogInclude }>;

export type CatalogQuery = {
  categorySlug?: string;
  storeSlug?: string;
  search?: string;
  promotionsOnly?: boolean;
  limit?: number;
};

export type CatalogSource = "database" | "demo";

export type CatalogListResult = {
  source: CatalogSource;
  products: CatalogProduct[];
};

export type CatalogProductResult = {
  source: CatalogSource;
  product?: CatalogProduct;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function databaseEnabled() {
  const requestedSource = process.env.ATW_CATALOG_SOURCE?.trim().toLocaleLowerCase();
  return requestedSource !== "demo" && Boolean(process.env.DATABASE_URL);
}

function demoCatalogProducts(query: CatalogQuery): CatalogProduct[] {
  let products = [...demoProducts];

  if (query.categorySlug) {
    const category = demoCategories.find((item) => item.slug === query.categorySlug);
    products = category
      ? products.filter((product) => normalize(product.category) === normalize(category.name))
      : [];
  }

  if (query.storeSlug) products = products.filter((product) => product.storeSlug === query.storeSlug);
  if (query.promotionsOnly) products = products.filter((product) => Boolean(product.oldPrice));

  if (query.search) {
    const search = normalize(query.search);
    products = products.filter((product) =>
      [product.name, product.category, product.storeName, product.storeSlug]
        .map(normalize)
        .join(" ")
        .includes(search),
    );
  }

  return products.slice(0, query.limit ?? 100);
}

function buildWhere(query: CatalogQuery): Prisma.ProductWhereInput {
  const search = query.search?.trim();
  return {
    status: "ACTIVE",
    stock: { gt: 0 },
    ...(query.categorySlug ? { category: { is: { slug: query.categorySlug } } } : {}),
    ...(query.storeSlug ? { seller: { is: { store: { is: { slug: query.storeSlug } } } } } : {}),
    ...(query.promotionsOnly ? { promotionalPrice: { not: null }, isPromotion: true } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { shortDescription: { contains: search, mode: "insensitive" } },
            { category: { is: { name: { contains: search, mode: "insensitive" } } } },
            { seller: { is: { store: { is: { name: { contains: search, mode: "insensitive" } } } } } },
          ],
        }
      : {}),
  };
}

function fallbackImage(slug: string) {
  return demoProducts.find((product) => product.slug === slug)?.image ?? "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=84";
}

function installment(price: number) {
  const count = price >= 100 ? 10 : price >= 50 ? 5 : 3;
  return `${count}x de ${formatCurrency(price / count)}`;
}

export function mapPersistedProduct(product: PersistedProduct): CatalogProduct {
  const promotionalPrice = product.promotionalPrice == null ? undefined : Number(product.promotionalPrice);
  const price = promotionalPrice ?? Number(product.price);
  const ratings = product.reviews.map((review) => review.rating);
  const store = product.seller.store;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.name ?? "Outros",
    storeName: store?.name ?? product.seller.tradeName,
    storeSlug: store?.slug ?? "atw-demo",
    price,
    oldPrice: promotionalPrice == null ? undefined : Number(product.price),
    installment: installment(price),
    rating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : Number(store?.rating ?? 0),
    reviews: ratings.length,
    sold: product.shortDescription ?? "Disponível para envio",
    image: product.images[0]?.url ?? fallbackImage(product.slug),
    badge: product.isPromotion ? "Oferta do dia" : undefined,
  };
}

export async function listCatalogProducts(query: CatalogQuery = {}): Promise<CatalogListResult> {
  const safeQuery = { ...query, limit: Math.min(Math.max(query.limit ?? 100, 1), 100) };
  if (!databaseEnabled()) return { source: "demo", products: demoCatalogProducts(safeQuery) };

  try {
    const products = await db.product.findMany({
      where: buildWhere(safeQuery),
      include: catalogInclude,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: safeQuery.limit,
    });
    return { source: "database", products: products.map(mapPersistedProduct) };
  } catch (error) {
    console.error("catalog database read failed", error instanceof Error ? error.message : "unknown error");
    return { source: "demo", products: demoCatalogProducts(safeQuery) };
  }
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProductResult> {
  if (!databaseEnabled()) return { source: "demo", product: demoProducts.find((product) => product.slug === slug) };

  try {
    const product = await db.product.findFirst({
      where: { slug, status: "ACTIVE", stock: { gt: 0 } },
      include: catalogInclude,
    });
    return { source: "database", product: product ? mapPersistedProduct(product) : undefined };
  } catch (error) {
    console.error("catalog product read failed", error instanceof Error ? error.message : "unknown error");
    return { source: "demo", product: demoProducts.find((product) => product.slug === slug) };
  }
}
