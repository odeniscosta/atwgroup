import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoCategories, demoProducts, demoStores } from "../src/modules/catalog/catalog.data";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL é obrigatória para executar o seed persistido.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

async function main() {
  const categoryIds = new Map<string, string>();
  for (const category of demoCategories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, imageUrl: category.tone },
      create: { name: category.name, slug: category.slug, imageUrl: category.tone },
    });
    categoryIds.set(category.name, record.id);
  }

  const stores = new Map(demoStores.map((store) => [store.slug, store]));
  for (const product of demoProducts) {
    if (!stores.has(product.storeSlug)) {
      stores.set(product.storeSlug, { slug: product.storeSlug, name: product.storeName, tagline: "Loja parceira ATW Group", city: "São Paulo, SP", rating: product.rating, products: 0, initials: initials(product.storeName), tone: "#7f6758" });
    }
  }

  const sellerIds = new Map<string, string>();
  for (const [index, store] of Array.from(stores.values()).entries()) {
    const user = await prisma.user.upsert({
      where: { email: `seed-${store.slug}@atwgroup.local` },
      update: { name: store.name, role: "SELLER" },
      create: { email: `seed-${store.slug}@atwgroup.local`, passwordHash: "seed-only-disabled", name: store.name, role: "SELLER" },
    });
    const seller = await prisma.seller.upsert({
      where: { userId: user.id },
      update: { tradeName: store.name, status: "APPROVED" },
      create: { userId: user.id, document: `00.000.000/0001-${String(index + 1).padStart(2, "0")}`, tradeName: store.name, status: "APPROVED" },
    });
    await prisma.store.upsert({
      where: { sellerId: seller.id },
      update: { slug: store.slug, name: store.name, description: store.tagline, city: store.city.split(", ")[0], state: store.city.split(", ")[1] ?? null, rating: store.rating, reviewCount: 0 },
      create: { sellerId: seller.id, slug: store.slug, name: store.name, description: store.tagline, city: store.city.split(", ")[0], state: store.city.split(", ")[1] ?? null, rating: store.rating, reviewCount: 0 },
    });
    sellerIds.set(store.slug, seller.id);
  }

  for (const product of demoProducts) {
    const sellerId = sellerIds.get(product.storeSlug);
    const categoryId = categoryIds.get(product.category);
    if (!sellerId || !categoryId) throw new Error(`Dados incompletos para ${product.slug}.`);
    await prisma.product.upsert({
      where: { id: product.id },
      update: { sellerId, categoryId, name: product.name, slug: product.slug, shortDescription: product.sold, description: "Produto selecionado pela curadoria ATW Group.", price: product.oldPrice ?? product.price, promotionalPrice: product.oldPrice ? product.price : null, stock: 100, status: "ACTIVE", featured: true, isPromotion: Boolean(product.oldPrice), images: { deleteMany: {}, create: { url: product.image, alt: product.name, position: 0 } } },
      create: { id: product.id, sellerId, categoryId, name: product.name, slug: product.slug, shortDescription: product.sold, description: "Produto selecionado pela curadoria ATW Group.", sku: `ATW-${product.id}`, price: product.oldPrice ?? product.price, promotionalPrice: product.oldPrice ? product.price : null, stock: 100, status: "ACTIVE", featured: true, isPromotion: Boolean(product.oldPrice), images: { create: { url: product.image, alt: product.name, position: 0 } } },
    });
  }
}

main().finally(() => prisma.$disconnect());
