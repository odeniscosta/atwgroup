"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, Store, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import type { CatalogCategory } from "@/types/catalog";

export function MarketplaceHeader({ categories }: Readonly<{ categories: CatalogCategory[] }>) {
  const router = useRouter();
  const { itemCount } = useCart();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push("/busca?q=" + encodeURIComponent(query));
  }

  return (
    <>
      <div className="bg-[#16120f] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white">
        <span className="text-[#f26822]">Frete grátis</span> em milhares de produtos · compre de quem faz
      </div>
      <header className="sticky top-0 z-40 border-b border-[#eee8df] bg-[#fffdf9]/95 backdrop-blur">
        <div className="container-shell flex h-[70px] items-center gap-4">
          <button type="button" aria-label="Abrir menu" className="rounded-full p-2 text-[#16120f] hover:bg-[#f8f4ee] lg:hidden" onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/" className="shrink-0 leading-none" aria-label="ATW Group, início">
            <span className="block text-[21px] font-black tracking-[-0.08em]">ATW</span>
            <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.32em] text-[#f26822]">Group</span>
          </Link>
          <form onSubmit={submitSearch} className="relative hidden min-w-0 flex-1 md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8178]" size={18} />
            <input aria-label="Buscar produtos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="O que você está procurando?" className="h-11 w-full rounded-full border border-[#e5ded5] bg-white pl-11 pr-5 text-sm outline-none transition focus:border-[#f26822] focus:ring-4 focus:ring-[#f26822]/10" />
          </form>
          <nav className="hidden items-center gap-5 lg:flex">
            <Link href="/venda-na-atw" className="flex items-center gap-2 text-xs font-bold text-[#5f5852] hover:text-[#f26822]"><Store size={17} /> Venda na ATW</Link>
            <Link href="/login" className="flex items-center gap-2 text-xs font-bold text-[#5f5852] hover:text-[#f26822]"><UserRound size={17} /> Minha conta</Link>
            <Link href="/minha-conta/favoritos" aria-label="Favoritos" className="text-[#5f5852] hover:text-[#f26822]"><Heart size={19} /></Link>
          </nav>
          <Link href="/carrinho" aria-label={"Carrinho com " + itemCount + " itens"} className="relative rounded-full bg-[#f26822] p-3 text-white shadow-[0_8px_20px_rgba(242,104,34,0.2)] transition hover:bg-[#d94f0f]">
            <ShoppingBag size={19} />
            {itemCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#16120f] px-1 text-[10px] font-bold text-white">{itemCount}</span>}
          </Link>
        </div>
        <div className="container-shell pb-3 md:hidden">
          <form onSubmit={submitSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a8178]" size={17} />
            <input aria-label="Buscar produtos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="O que você está procurando?" className="h-11 w-full rounded-full border border-[#e5ded5] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#f26822]" />
          </form>
        </div>
        <div className="hidden border-t border-[#f1ece5] md:block">
          <div className="container-shell flex h-11 items-center gap-6 overflow-x-auto hide-scrollbar">
            <Link href="/categorias" className="shrink-0 text-xs font-black uppercase tracking-[0.1em] text-[#f26822]">Categorias</Link>
            {categories.map((category) => <Link key={category.slug} href={"/categoria/" + category.slug} className="shrink-0 text-sm text-[#5f5852] hover:text-[#f26822]">{category.name}</Link>)}
            <Link href="/ofertas" className="shrink-0 text-sm font-bold text-[#f26822]">Ofertas do dia</Link>
          </div>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-30 bg-[#16120f]/25 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="mt-[126px] w-[min(88%,360px)] rounded-r-3xl bg-[#fffdf9] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#8a8178]">Explorar</p>
            <div className="grid gap-1">
              <Link href="/categorias" className="rounded-xl px-3 py-3 font-bold hover:bg-[#fff0e6]">Todas as categorias</Link>
              {categories.map((category) => <Link key={category.slug} href={"/categoria/" + category.slug} className="rounded-xl px-3 py-3 text-[#5f5852] hover:bg-[#fff0e6]">{category.name}</Link>)}
              <Link href="/venda-na-atw" className="mt-3 rounded-xl bg-[#16120f] px-3 py-3 font-bold text-white">Quero vender na ATW</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileNavigation() {
  const { itemCount } = useCart();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-center justify-around border-t border-[#eee8df] bg-white/95 px-2 pb-1 shadow-[0_-8px_24px_rgba(22,18,15,0.08)] backdrop-blur md:hidden">
      <Link href="/" className="flex flex-col items-center gap-1 text-[#f26822]"><span className="text-lg">⌂</span><span className="text-[10px] font-bold">Início</span></Link>
      <Link href="/categorias" className="flex flex-col items-center gap-1 text-[#5f5852]"><span className="text-lg">◈</span><span className="text-[10px] font-bold">Categorias</span></Link>
      <Link href="/ofertas" className="flex flex-col items-center gap-1 text-[#5f5852]"><span className="text-lg">✦</span><span className="text-[10px] font-bold">Ofertas</span></Link>
      <Link href="/carrinho" className="relative flex flex-col items-center gap-1 text-[#5f5852]"><ShoppingBag size={18} /><span className="text-[10px] font-bold">Carrinho</span>{itemCount > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f26822] px-1 text-[9px] font-bold text-white">{itemCount}</span>}</Link>
      <Link href="/login" className="flex flex-col items-center gap-1 text-[#5f5852]"><UserRound size={18} /><span className="text-[10px] font-bold">Minha conta</span></Link>
    </nav>
  );
}
