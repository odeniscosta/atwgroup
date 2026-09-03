import Link from "next/link";
import { MarketplaceHeader, MobileNavigation } from "@/components/marketplace/header";
import { demoCategories } from "@/modules/catalog/catalog.data";

export function MarketplaceShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#fffdf9] pb-20 md:pb-0">
      <MarketplaceHeader categories={demoCategories} />
      {children}
      <footer className="bg-[#16120f] pb-24 pt-12 text-white md:pb-8">
        <div className="container-shell flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Link href="/" className="leading-none">
              <span className="block text-3xl font-black tracking-[-0.1em]">ATW</span>
              <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.35em] text-[#f26822]">Group</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">Seu shopping, onde você estiver. Variedade, oportunidade e compra segura.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
            <Link href="/categorias" className="hover:text-white">Categorias</Link>
            <Link href="/rifas" className="hover:text-white">Rifas</Link>
            <Link href="/ofertas" className="hover:text-white">Ofertas</Link>
            <Link href="/venda-na-atw" className="hover:text-white">Venda na ATW</Link>
            <Link href="/acompanhar-pedido" className="hover:text-white">Acompanhar pedido</Link>
          </div>
        </div>
      </footer>
      <MobileNavigation />
    </div>
  );
}
