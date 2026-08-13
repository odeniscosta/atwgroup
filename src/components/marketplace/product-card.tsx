"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { discountPercent, formatCurrency } from "@/lib/format";
import type { CatalogProduct } from "@/types/catalog";

export function ProductCard({ product }: Readonly<{ product: CatalogProduct }>) {
  const { addItem } = useCart();
  const [favorite, setFavorite] = useState(false);
  const [added, setAdded] = useState(false);
  const discount = discountPercent(product.price, product.oldPrice);

  function addToCart() {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group min-w-[205px] max-w-[235px] flex-1 overflow-hidden rounded-2xl border border-[#eee8df] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#f7c5a8] hover:shadow-[0_16px_38px_rgba(68,44,25,0.1)]">
      <div className="relative aspect-square overflow-hidden bg-[#f7f2ec]">
        <Link href={"/produto/" + product.slug} aria-label={"Ver " + product.name}>
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 45vw, 240px" className="object-cover transition duration-500 group-hover:scale-105" />
        </Link>
        {product.badge && <span className="absolute left-3 top-3 rounded-full bg-[#f26822] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">{product.badge}</span>}
        <button type="button" onClick={() => setFavorite((value) => !value)} aria-label={favorite ? "Remover " + product.name + " dos favoritos" : "Adicionar " + product.name + " aos favoritos"} className={"absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition " + (favorite ? "text-[#f26822]" : "text-[#5f5852] hover:text-[#f26822]")}>
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-3.5">
        <Link href={"/produto/" + product.slug} className="block">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9b9188]">{product.category}</p>
          <h3 className="line-clamp-2 min-h-[40px] text-sm font-bold leading-5 text-[#16120f]">{product.name}</h3>
        </Link>
        <p className="mt-2 text-xs text-[#8a8178]">{product.storeName}</p>
        <div className="mt-2 flex items-center gap-1 text-xs text-[#c27b19]"><Star size={13} fill="currentColor" /> <span className="font-bold">{product.rating}</span> <span className="text-[#9b9188]">({product.reviews})</span></div>
        {product.oldPrice && <p className="mt-3 text-xs text-[#9b9188] line-through">{formatCurrency(product.oldPrice)}</p>}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[21px] font-black tracking-[-0.05em] text-[#16120f]">{formatCurrency(product.price)}</p>
            {discount && <p className="text-[10px] font-bold text-[#f26822]">{discount}% OFF · {product.installment}</p>}
          </div>
          <button type="button" onClick={addToCart} aria-label={"Adicionar " + product.name + " ao carrinho"} className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition " + (added ? "bg-[#157a54] text-white" : "bg-[#16120f] text-white hover:bg-[#f26822]")}>
            {added ? <Check size={17} /> : <ShoppingCart size={16} />}
          </button>
        </div>
        {product.pix && <p className="mt-2 text-[11px] font-bold text-[#157a54]">{product.pix}</p>}
      </div>
    </article>
  );
}
