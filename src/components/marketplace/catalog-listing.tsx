import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { ProductCard } from "@/components/marketplace/product-card";
import type { CatalogProduct } from "@/types/catalog";

type CatalogListingProps = {
  eyebrow: string;
  title: string;
  description: string;
  products: CatalogProduct[];
  emptyTitle?: string;
  emptyDescription?: string;
};

export function CatalogListing({
  eyebrow,
  title,
  description,
  products,
  emptyTitle = "Nenhum produto encontrado",
  emptyDescription = "Tente explorar outra categoria ou fazer uma nova busca.",
}: Readonly<CatalogListingProps>) {
  return (
    <MarketplaceShell>
      <main>
        <section className="container-shell py-12 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">{eyebrow}</p>
            <h1 className="mt-3 text-balance text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f5852] md:text-base">{description}</p>
          </div>

          {products.length > 0 ? (
            <>
              <div className="mt-10 flex items-center justify-between gap-4 border-y border-[#eee8df] py-4">
                <p className="text-sm font-bold text-[#5f5852]">
                  {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
                </p>
                <Link href="/categorias" className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[#f26822] sm:flex">
                  Explorar categorias <ArrowRight size={15} />
                </Link>
              </div>
              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            </>
          ) : (
            <div className="mt-10 flex flex-col items-center rounded-3xl border border-[#eee8df] bg-white px-6 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0e6] text-[#f26822]"><SearchX size={28} /></span>
              <h2 className="mt-5 text-xl font-black tracking-[-0.04em]">{emptyTitle}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#5f5852]">{emptyDescription}</p>
              <Link href="/categorias" className="mt-7 rounded-full bg-[#f26822] px-5 py-3 text-sm font-black text-white hover:bg-[#d94f0f]">Ver categorias</Link>
            </div>
          )}
        </section>
      </main>
    </MarketplaceShell>
  );
}
