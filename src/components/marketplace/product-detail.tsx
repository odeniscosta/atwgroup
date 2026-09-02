"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/catalog";

export function ProductDetail({ product }: Readonly<{ product: CatalogProduct }>) {
  const { addItem } = useCart();
  const images = product.images?.length ? product.images : [product.image];
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);

  function addToCart() {
    for (let index = 0; index < quantity; index += 1) addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <main className="container-shell py-7 md:py-12">
      <nav className="mb-6 text-xs font-bold text-[#8a8178]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#f26822]">Início</Link> / <Link href="/categorias" className="hover:text-[#f26822]">Categorias</Link> / {product.name}
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div className="overflow-hidden rounded-[28px] bg-[#f7f2ec]">
          <div className="relative aspect-square">
            <Image src={images[selectedImage] ?? product.image} alt={`${product.name} — foto ${selectedImage + 1}`} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" />
            {product.badge && <span className="absolute left-5 top-5 rounded-full bg-[#f26822] px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">{product.badge}</span>}
          </div>
          </div>
          {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Fotos do produto">{images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(index)} aria-label={`Ver foto ${index + 1}`} aria-pressed={selectedImage === index} className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-[#f7f2ec] ${selectedImage === index ? "border-[#f26822]" : "border-transparent"}`}><Image src={image} alt="" fill sizes="120px" className="object-cover" /></button>)}</div>}
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">{product.category}</p>
          <h1 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-5xl">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-1 font-black text-[#c27b19]"><Star size={16} fill="currentColor" /> {product.rating}</span><span className="text-[#8a8178]">{product.reviews} avaliações</span><span className="text-[#157a54]">{product.sold}</span></div>
          <div className="mt-7 border-y border-[#eee8df] py-6"><p className="text-sm text-[#9b9188] line-through">{product.oldPrice ? formatCurrency(product.oldPrice) : ""}</p><p className="mt-1 text-4xl font-black tracking-[-0.07em]">{formatCurrency(product.price)}</p><p className="mt-1 text-sm font-bold text-[#157a54]">{product.pix ?? "Pagamento via PIX com desconto"}</p><p className="mt-2 text-sm text-[#5f5852]">ou {product.installment} sem juros no cartão</p></div>
          <div className="mt-6 flex items-center justify-between gap-4"><span className="text-sm font-black">Quantidade</span><div className="flex items-center rounded-full border border-[#ded6cd] bg-white"><button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3 text-[#5f5852] hover:text-[#f26822]"><Minus size={16} /></button><span className="min-w-8 text-center text-sm font-black">{quantity}</span><button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantity((value) => value + 1)} className="p-3 text-[#5f5852] hover:text-[#f26822]"><Plus size={16} /></button></div></div>
          <button type="button" onClick={addToCart} className="mt-6 flex h-14 items-center justify-center gap-2 rounded-full bg-[#f26822] px-6 text-base font-black text-white shadow-[0_12px_26px_rgba(242,104,34,0.24)] transition hover:bg-[#d94f0f]">{added ? <Check size={19} /> : <ShoppingBag size={19} />} {added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}</button>
          <div className="mt-5 grid gap-3 rounded-2xl bg-[#fff8f2] p-4 text-sm text-[#5f5852]"><p className="flex items-center gap-3"><Truck size={18} className="text-[#f26822]" /> Envio calculado no checkout</p><p className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#157a54]" /> Compra protegida pela ATW Group</p></div>
          <div className="mt-7 flex items-center justify-between border-t border-[#eee8df] pt-5"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b9188]">Vendido por</p><Link href={"/loja/" + product.storeSlug} className="mt-1 block font-black hover:text-[#f26822]">{product.storeName}</Link></div><Link href={"/loja/" + product.storeSlug} className="rounded-full border border-[#ded6cd] px-4 py-2 text-xs font-black hover:border-[#f26822]">Ver loja</Link></div>
          <button type="button" className="mt-5 flex items-center gap-2 self-start text-sm font-bold text-[#5f5852] hover:text-[#f26822]"><Heart size={17} /> Adicionar aos favoritos</button>
        </div>
      </div>
      <section className="mt-14 grid gap-5 border-t border-[#eee8df] pt-10 md:grid-cols-3"><div><h2 className="font-black">Descrição do produto</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Uma escolha prática, bonita e pronta para fazer parte da sua rotina. Produto selecionado pela curadoria ATW Group.</p></div><div><h2 className="font-black">Compra segura</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Pagamento protegido, acompanhamento do pedido e suporte da nossa equipe.</p></div><div><h2 className="font-black">Avaliações</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Clientes avaliam produtos comprados e ajudam a comunidade a escolher melhor.</p></div></section>
    </main>
  );
}
