import Link from "next/link";
import { ArrowRight, ChevronRight, MessageCircle, ShieldCheck, Sparkles, Star, Truck, WalletCards } from "lucide-react";
import { MarketplaceHeader, MobileNavigation } from "@/components/marketplace/header";
import { ProductCard } from "@/components/marketplace/product-card";
import type { CatalogCategory, CatalogProduct, CatalogStore } from "@/types/catalog";

type HomePageProps = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  stores: CatalogStore[];
};

export function HomePage({ categories, products, stores }: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#fffdf9] pb-20 md:pb-0">
      <MarketplaceHeader categories={categories} />
      <main>
        <section className="container-shell mt-4 md:mt-7">
          <div className="hero-grid relative min-h-[440px] overflow-hidden rounded-[28px] px-6 py-12 text-white shadow-[0_20px_50px_rgba(68,44,25,0.16)] sm:px-12 md:min-h-[430px] md:px-16 md:py-16">
            <div className="relative z-10 max-w-xl">
              <p className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#ffb48b]"><Sparkles size={15} /> Shopping do povo online</p>
              <h1 className="text-balance text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[0.92] tracking-[-0.08em]">Tudo que você gosta.<br /><span className="text-[#f26822]">Mais perto.</span></h1>
              <p className="mt-6 max-w-md text-base leading-7 text-white/75 md:text-lg">Produtos de lojas reais, ofertas que cabem no bolso e a praticidade de comprar pelo celular.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/ofertas" className="inline-flex items-center gap-2 rounded-full bg-[#f26822] px-6 py-3.5 text-sm font-black text-white transition hover:bg-[#ff8142]">Ver ofertas <ArrowRight size={17} /></Link>
                <Link href="/categorias" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20">Explorar categorias</Link>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 hidden w-52 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md lg:block">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/60">Na ATW hoje</p>
              <p className="mt-2 text-3xl font-black">+2.400</p>
              <p className="text-sm text-white/70">produtos esperando por você</p>
            </div>
          </div>
        </section>

        <section className="container-shell py-8 md:py-12">
          <SectionHeader eyebrow="Explore por interesse" title="Um pouco de tudo. Do seu jeito." href="/categorias" linkText="Ver todas" />
          <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {categories.map((category) => (
              <Link key={category.slug} href={"/categoria/" + category.slug} className="group min-w-[128px] rounded-2xl border border-[#eee8df] bg-white p-3 transition hover:-translate-y-1 hover:border-[#f7c5a8] hover:shadow-[0_12px_24px_rgba(68,44,25,0.08)]">
                <span className="flex h-20 items-center justify-center rounded-xl text-3xl transition group-hover:scale-105" style={{ backgroundColor: category.tone }}>{category.icon}</span>
                <span className="mt-3 block text-sm font-black">{category.name}</span>
                <span className="mt-1 block truncate text-[11px] text-[#8a8178]">{category.eyebrow}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container-shell">
          <div className="soft-grid flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border border-[#f3d9c8] bg-[#fff8f2] px-6 py-6 sm:flex-row sm:items-center sm:px-8">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Seu carrinho agradece</p><h2 className="mt-1 text-xl font-black tracking-[-0.04em] md:text-2xl">PIX, cartão e frete que cabe no bolso.</h2></div>
            <div className="flex shrink-0 items-center gap-5 text-xs font-bold text-[#5f5852]"><span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#157a54]" /> Compra segura</span><span className="hidden items-center gap-2 sm:flex"><Truck size={18} className="text-[#f26822]" /> Envio rápido</span></div>
          </div>
        </section>

        <ProductSection eyebrow="Curadoria ATW" title="Ofertas do dia" subtitle="Achados que valem a visita" products={products.slice(0, 4)} href="/ofertas" />
        <ProductSection eyebrow="Para comprar agora" title="Mais vendidos" subtitle="O que está fazendo sucesso por aqui" products={products.slice(4).concat(products.slice(1, 3))} href="/busca?sort=popular" />

        <section className="bg-[#16120f] py-12 text-white md:py-16">
          <div className="container-shell">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Gente de verdade, lojas de verdade</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] md:text-4xl">Conheça quem vende na ATW.</h2></div>
              <Link href="/lojas" className="inline-flex items-center gap-2 text-sm font-bold text-[#ffb48b] hover:text-white">Ver todas as lojas <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stores.map((store) => <StoreCard key={store.slug} store={store} />)}
            </div>
          </div>
        </section>

        <section className="container-shell py-12 md:py-16">
          <div className="grid gap-5 md:grid-cols-[1.05fr_1.95fr]">
            <div className="flex min-h-[300px] flex-col justify-between overflow-hidden rounded-3xl bg-[#f26822] p-7 text-white md:p-9">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Mais que comprar</p><h2 className="mt-3 max-w-sm text-3xl font-black leading-tight tracking-[-0.06em]">Venda seu produto para quem está procurando.</h2></div>
              <Link href="/venda-na-atw" className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#16120f] px-5 py-3 text-sm font-black transition hover:bg-white hover:text-[#16120f]">Quero vender na ATW <ArrowRight size={16} /></Link>
            </div>
            <div className="grid gap-4 rounded-3xl border border-[#eee8df] bg-white p-6 sm:grid-cols-2 md:p-8">
              <Benefit icon={<ShieldCheck size={22} />} title="Compra segura" text="Pagamento protegido e suporte quando você precisar." />
              <Benefit icon={<WalletCards size={22} />} title="Preço que faz sentido" text="PIX, cartão e parcelamento para escolher o melhor jeito." />
              <Benefit icon={<Truck size={22} />} title="Acompanhe tudo" text="Do pedido à entrega, sem ficar no escuro." />
              <Benefit icon={<MessageCircle size={22} />} title="Tem alguém por perto" text="Fale com a loja e com a ATW pelo WhatsApp." />
            </div>
          </div>
        </section>

        <section className="border-y border-[#eee8df] bg-[#f8f4ee] py-10 md:py-14">
          <div className="container-shell flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-lg"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Não perca os próximos achados</p><h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Ofertas boas chegam primeiro para quem acompanha.</h2><p className="mt-3 text-sm leading-6 text-[#5f5852]">Receba novidades, cupons e oportunidades selecionadas. Sem spam, só o que vale a pena.</p></div>
            <form className="flex w-full max-w-md gap-2" action="#"><label className="sr-only" htmlFor="newsletter-email">Seu melhor e-mail</label><input id="newsletter-email" type="email" required placeholder="Seu melhor e-mail" className="h-12 min-w-0 flex-1 rounded-full border border-[#ded6cd] bg-white px-5 text-sm outline-none focus:border-[#f26822]" /><button type="submit" className="rounded-full bg-[#16120f] px-5 text-sm font-black text-white transition hover:bg-[#f26822]">Quero receber</button></form>
          </div>
        </section>
      </main>
      <Footer />
      <a href="https://api.whatsapp.com/send?text=Olá%20ATW%20Group%2C%20preciso%20de%20ajuda" target="_blank" rel="noreferrer" aria-label="Falar com a ATW Group pelo WhatsApp" className="fixed bottom-[84px] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_24px_rgba(37,211,102,0.3)] transition hover:scale-105 md:bottom-6 md:right-6"><MessageCircle size={23} /></a>
      <MobileNavigation />
    </div>
  );
}

function SectionHeader({ eyebrow, title, href, linkText }: Readonly<{ eyebrow: string; title: string; href: string; linkText: string }>) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f26822]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-[-0.06em] md:text-3xl">{title}</h2></div><Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-black text-[#16120f] hover:text-[#f26822]">{linkText} <ChevronRight size={15} /></Link></div>;
}

function ProductSection({ eyebrow, title, subtitle, products, href }: Readonly<{ eyebrow: string; title: string; subtitle: string; products: CatalogProduct[]; href: string }>) {
  return <section className="container-shell py-10 md:py-14"><SectionHeader eyebrow={eyebrow} title={title} href={href} linkText="Ver mais" /><p className="-mt-3 mb-5 text-sm text-[#8a8178]">{subtitle}</p><div className="hide-scrollbar flex gap-3 overflow-x-auto pb-3 md:gap-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}

function StoreCard({ store }: Readonly<{ store: CatalogStore }>) {
  return <Link href={"/loja/" + store.slug} className="group rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition hover:-translate-y-1 hover:bg-white/[0.12]"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ backgroundColor: store.tone }}>{store.initials}</span><div><h3 className="font-black">{store.name}</h3><p className="text-xs text-white/55">{store.city}</p></div></div><p className="mt-5 text-sm leading-5 text-white/70">{store.tagline}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="flex items-center gap-1 text-[#ffb03e]"><Star size={13} fill="currentColor" /> {store.rating.toFixed(1)}</span><span className="text-white/45">{store.products} produtos <ArrowRight size={13} className="ml-1 inline transition group-hover:translate-x-1" /></span></div></Link>;
}

function Benefit({ icon, title, text }: Readonly<{ icon: React.ReactNode; title: string; text: string }>) {
  return <div className="flex gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e6] text-[#f26822]">{icon}</span><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-5 text-[#8a8178]">{text}</p></div></div>;
}

function Footer() {
  return <footer className="bg-[#16120f] pb-24 pt-12 text-white md:pb-8"><div className="container-shell grid gap-10 sm:grid-cols-2 md:grid-cols-[1.3fr_1fr_1fr_1fr]"><div><div className="leading-none"><span className="block text-3xl font-black tracking-[-0.1em]">ATW</span><span className="ml-1 text-[10px] font-bold uppercase tracking-[0.35em] text-[#f26822]">Group</span></div><p className="mt-5 max-w-xs text-sm leading-6 text-white/55">Seu shopping, onde você estiver. Variedade, oportunidade e compra segura em um só lugar.</p><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/35">© 2026 ATW Group</p></div><FooterColumn title="Comprar" links={["Categorias", "Ofertas do dia", "Lojas", "Como comprar"]} /><FooterColumn title="Vender" links={["Venda na ATW", "Central do vendedor", "Taxas e comissões", "Comece agora"]} /><FooterColumn title="Ajuda" links={["Fale com a gente", "Acompanhar pedido", "Termos de uso", "Privacidade"]} /></div></footer>;
}

function FooterColumn({ title, links }: Readonly<{ title: string; links: string[] }>) {
  return <div><h3 className="text-xs font-black uppercase tracking-[0.16em] text-[#f26822]">{title}</h3><ul className="mt-4 grid gap-3 text-sm text-white/60">{links.map((link) => <li key={link}><Link href="/" className="transition hover:text-white">{link}</Link></li>)}</ul></div>;
}
