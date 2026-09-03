import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { demoCategories, demoProducts } from "@/modules/catalog/catalog.data";
import { listCatalogProducts } from "@/modules/catalog/catalog.repository";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const result = await listCatalogProducts({ limit: 100 });
  const products = result.source === "database" ? result.products : demoProducts;

  return (
    <MarketplaceShell>
      <main className="container-shell py-12 md:py-16">
        <section className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Explore a ATW</p>
          <h1 className="mt-3 text-balance text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-6xl">Encontre seu próximo favorito.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f5852] md:text-base">Categorias para navegar com calma, descobrir novas lojas e comprar de quem faz.</p>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5">
          {demoCategories.map((category) => {
            const productCount = products.filter((product) => product.category === category.name).length;
            const isRaffleCategory = category.slug === "rifas";
            return (
              <Link key={category.slug} href={isRaffleCategory ? "/rifas" : `/categoria/${category.slug}`} className="group overflow-hidden rounded-3xl border border-[#eee8df] bg-white p-5 transition hover:-translate-y-1 hover:border-[#f7c5a8] hover:shadow-[0_16px_38px_rgba(68,44,25,0.1)] md:p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: category.tone }}>{category.icon}</span>
                <p className="mt-7 text-xs font-black uppercase tracking-[0.1em] text-[#9b9188]">{category.eyebrow}</p>
                <h2 className="mt-2 text-lg font-black tracking-[-0.04em] md:text-xl">{category.name}</h2>
                <p className="mt-2 text-xs text-[#8a8178]">{isRaffleCategory ? "Campanhas abertas" : `${productCount} ${productCount === 1 ? "produto" : "produtos"}`}</p>
                <span className="mt-5 flex items-center gap-2 text-xs font-black text-[#f26822]">{isRaffleCategory ? "Ver rifas" : "Ver produtos"} <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </section>
      </main>
    </MarketplaceShell>
  );
}
