"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, LockKeyhole, QrCode, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/lib/format";

export function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const shipping = subtotal >= 199 ? 0 : 19.9;
  const total = subtotal + shipping;
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), address: form.get("address"), paymentMethod, items }) });
      const result = (await response.json()) as { number?: string; error?: string };
      if (!response.ok || !result.number) throw new Error(result.error ?? "Não foi possível criar o pedido.");
      clearCart(); router.push("/pedido/" + result.number);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Falha ao criar pedido."); setSubmitting(false); }
  }

  if (!items.length) return <main className="container-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center"><CheckCircle2 size={44} className="text-[#157a54]" /><h1 className="mt-5 text-3xl font-black">Nada para finalizar</h1><p className="mt-2 text-sm text-[#8a8178]">Adicione um produto ao carrinho para continuar.</p><Link href="/" className="mt-6 rounded-full bg-[#f26822] px-6 py-3 text-sm font-black text-white">Voltar para a loja</Link></main>;

  return <main className="container-shell py-8 md:py-12"><Link href="/carrinho" className="inline-flex items-center gap-2 text-sm font-bold text-[#8a8178] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar ao carrinho</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]"><form onSubmit={submit} className="grid gap-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Último passo</p><h1 className="mt-2 text-4xl font-black tracking-[-0.07em]">Finalizar compra</h1></div><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">1. Seus dados</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold sm:col-span-2">Nome completo<input required name="name" placeholder="Como podemos te chamar?" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">E-mail<input required type="email" name="email" placeholder="voce@email.com" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">WhatsApp<input required name="phone" placeholder="(11) 99999-9999" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label></div></section><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">2. Entrega</h2><label className="mt-5 grid gap-2 text-sm font-bold">Endereço completo<input required name="address" placeholder="Rua, número, bairro, cidade - UF" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><p className="mt-4 flex items-center gap-2 text-xs text-[#157a54]"><Truck size={16} /> Entrega estimada em 3 a 8 dias úteis</p></section><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">3. Pagamento</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setPaymentMethod("pix")} className={"flex items-center gap-3 rounded-2xl border p-4 text-left transition " + (paymentMethod === "pix" ? "border-[#f26822] bg-[#fff8f2]" : "border-[#eee8df]")}><QrCode className="text-[#157a54]" /><span><strong className="block text-sm">PIX</strong><small className="text-xs text-[#8a8178]">Aprovação rápida</small></span></button><button type="button" onClick={() => setPaymentMethod("card")} className={"flex items-center gap-3 rounded-2xl border p-4 text-left transition " + (paymentMethod === "card" ? "border-[#f26822] bg-[#fff8f2]" : "border-[#eee8df]")}><CreditCard className="text-[#f26822]" /><span><strong className="block text-sm">Cartão</strong><small className="text-xs text-[#8a8178]">Até 10x sem juros</small></span></button></div><p className="mt-4 flex items-center gap-2 text-xs text-[#8a8178]"><LockKeyhole size={14} /> Ambiente protegido para apresentação do fluxo.</p></section>{error && <p className="rounded-2xl bg-[#fff0e6] p-4 text-sm font-bold text-[#b43c0d]">{error}</p>}<button disabled={submitting} className="h-14 rounded-full bg-[#f26822] px-6 text-base font-black text-white shadow-[0_12px_26px_rgba(242,104,34,0.24)] hover:bg-[#d94f0f] disabled:cursor-wait disabled:opacity-60">{submitting ? "Criando pedido..." : "Confirmar pedido"}</button></form><aside className="h-fit rounded-3xl bg-[#16120f] p-6 text-white lg:sticky lg:top-28"><h2 className="text-xl font-black">Resumo</h2><div className="mt-6 grid gap-3 border-b border-white/10 pb-5 text-sm"><div className="flex justify-between text-white/65"><span>Produtos</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-white/65"><span>Entrega</span><span>{shipping === 0 ? "Grátis" : formatCurrency(shipping)}</span></div></div><div className="mt-5 flex justify-between text-xl font-black"><span>Total</span><span>{formatCurrency(total)}</span></div><p className="mt-5 text-xs leading-5 text-white/45">Você receberá a confirmação e poderá acompanhar o pedido na próxima tela.</p></aside></div></main>;
}
