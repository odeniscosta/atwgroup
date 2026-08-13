import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { demoCategories, demoProducts } from "../src/modules/catalog/catalog.data";

const connectionString = process.env.DATABASE_URL ?? "postgresql://atw:atw_dev@localhost:5432/atwgroup";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@atwgroup.com.br" },
    update: { name: "ATW Group Demo" },
    create: { email: "demo@atwgroup.com.br", passwordHash: "demo-seed-only", name: "ATW Group Demo", role: "SELLER" },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: user.id },
    update: { tradeName: "Lojas ATW Demo", status: "APPROVED" },
    create: { userId: user.id, document: "00.000.000/0001-00", tradeName: "Lojas ATW Demo", status: "APPROVED" },
  });

  await prisma.store.upsert({
    where: { sellerId: seller.id },
    update: { name: "Lojas ATW Demo", description: "Seleção de produtos da demonstração ATW Group", slug: "atw-demo" },
    create: { sellerId: seller.id, name: "Lojas ATW Demo", description: "Seleção de produtos da demonstração ATW Group", slug: "atw-demo", city: "São Paulo", state: "SP" },
  });

  const categoryIds = new Map<string, string>();
  for (const category of demoCategories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, imageUrl: category.tone },
      create: { name: category.name, slug: category.slug, imageUrl: category.tone },
    });
    categoryIds.set(category.name, record.id);
  }

  for (const product of demoProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { name: product.name, price: product.price, promotionalPrice: product.price, stock: 100, status: "ACTIVE", featured: true, isPromotion: Boolean(product.oldPrice) },
      create: { id: product.id, sellerId: seller.id, categoryId: categoryIds.get(product.category), name: product.name, slug: product.slug, shortDescription: product.sold, description: "Produto selecionado pela curadoria ATW Group.", sku: `ATW-${product.id}`, price: product.price, promotionalPrice: product.price, stock: 100, status: "ACTIVE", featured: true, isPromotion: Boolean(product.oldPrice), images: { create: { url: product.image, alt: product.name } } },
    });
  }
}

main().finally(() => prisma.$disconnect());
