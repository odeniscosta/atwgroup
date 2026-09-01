"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CreditCard, Copy, LockKeyhole, QrCode, Truck } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/lib/format";

type PaymentResult = { status?: "pending" | "approved" | "rejected"; qrCode?: string; qrCodeBase64?: string; error?: string };
type CompletedOrder = { number: string; numbers: string[]; payment?: PaymentResult; paymentMessage?: string };

export function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const shipping = subtotal >= 199 ? 0 : 19.9;
  const total = subtotal + shipping;
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentMethod === "card") { setError("Pagamento por cartão exige a tokenização segura do provedor. Configure o SDK público antes de habilitar este método."); return; }
    setSubmitting(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), address: form.get("address"), paymentMethod, items: items.map((item) => ({ id: item.id, quantity: item.quantity })) }) });
      const result = (await response.json()) as { number?: string; numbers?: string[]; source?: "database" | "demo"; error?: string };
      if (!response.ok || !result.number) throw new Error(result.error ?? "Não foi possível criar o pedido.");
      const numbers = result.numbers ?? [result.number];
      let payment: PaymentResult | undefined;
      let paymentMessage = result.source === "demo" ? "Pedido criado em modo demonstração." : undefined;
      if (result.source === "database") {
        const payments = await Promise.all(numbers.map(async (number) => {
          const paymentResponse = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: number, payerEmail: form.get("email"), method: "pix" }) });
          const paymentData = (await paymentResponse.json()) as PaymentResult;
          if (!paymentResponse.ok) throw new Error(paymentData.error ?? "Pedido criado, mas não foi possível gerar o PIX.");
          return paymentData;
        }));
        payment = payments[0];
        if (numbers.length > 1) paymentMessage = `${numbers.length} pedidos foram criados. O PIX exibido é do primeiro pedido.`;
      }
      clearCart(); setCompleted({ number: result.number, numbers, payment, paymentMessage });
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Falha ao criar pedido."); }
    finally { setSubmitting(false); }
  }

  if (completed) return <OrderComplete order={completed} />;
  if (!items.length) return <main className="container-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center"><CheckCircle2 size={44} className="text-[#157a54]" /><h1 className="mt-5 text-3xl font-black">Nada para finalizar</h1><p className="mt-2 text-sm text-[#8a8178]">Adicione um produto ao carrinho para continuar.</p><Link href="/" className="mt-6 rounded-full bg-[#f26822] px-6 py-3 text-sm font-black text-white">Voltar para a loja</Link></main>;

  return <main className="container-shell py-8 md:py-12"><Link href="/carrinho" className="inline-flex items-center gap-2 text-sm font-bold text-[#8a8178] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar ao carrinho</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]"><form onSubmit={submit} className="grid gap-5"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Último passo</p><h1 className="mt-2 text-4xl font-black tracking-[-0.07em]">Finalizar compra</h1></div><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">1. Seus dados</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold sm:col-span-2">Nome completo<input required name="name" placeholder="Como podemos te chamar?" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">E-mail<input required type="email" name="email" placeholder="voce@email.com" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">WhatsApp<input required name="phone" placeholder="(11) 99999-9999" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label></div></section><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">2. Entrega</h2><label className="mt-5 grid gap-2 text-sm font-bold">Endereço completo<input required name="address" placeholder="Rua, número, bairro, cidade - UF" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><p className="mt-4 flex items-center gap-2 text-xs text-[#157a54]"><Truck size={16} /> Entrega estimada em 3 a 8 dias úteis</p></section><section className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><h2 className="text-lg font-black">3. Pagamento</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { setPaymentMethod("pix"); setError(""); }} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${paymentMethod === "pix" ? "border-[#f26822] bg-[#fff8f2]" : "border-[#eee8df]"}`}><QrCode className="text-[#157a54]" /><span><strong className="block text-sm">PIX</strong><small className="text-xs text-[#8a8178]">Aprovação rápida</small></span></button><button type="button" onClick={() => { setPaymentMethod("card"); setError(""); }} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${paymentMethod === "card" ? "border-[#f26822] bg-[#fff8f2]" : "border-[#eee8df]"}`}><CreditCard className="text-[#f26822]" /><span><strong className="block text-sm">Cartão</strong><small className="text-xs text-[#8a8178]">Tokenização segura necessária</small></span></button></div><p className="mt-4 flex items-center gap-2 text-xs text-[#8a8178]"><LockKeyhole size={14} /> Nenhum número de cartão é recebido ou armazenado por esta aplicação.</p></section>{error && <p role="alert" className="rounded-2xl bg-[#fff0e6] p-4 text-sm font-bold text-[#b43c0d]">{error}</p>}<button disabled={submitting} className="h-14 rounded-full bg-[#f26822] px-6 text-base font-black text-white shadow-[0_12px_26px_rgba(242,104,34,0.24)] hover:bg-[#d94f0f] disabled:cursor-wait disabled:opacity-60">{submitting ? "Criando pedido..." : "Confirmar pedido"}</button></form><aside className="h-fit rounded-3xl bg-[#16120f] p-6 text-white lg:sticky lg:top-28"><h2 className="text-xl font-black">Resumo</h2><div className="mt-6 grid gap-3 border-b border-white/10 pb-5 text-sm"><div className="flex justify-between text-white/65"><span>Produtos</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-white/65"><span>Entrega</span><span>{shipping === 0 ? "Grátis" : formatCurrency(shipping)}</span></div></div><div className="mt-5 flex justify-between text-xl font-black"><span>Total</span><span>{formatCurrency(total)}</span></div><p className="mt-5 text-xs leading-5 text-white/45">Após criar o pedido, o PIX será gerado pelo provedor quando o ambiente estiver configurado.</p></aside></div></main>;
}

function OrderComplete({ order }: Readonly<{ order: CompletedOrder }>) {
  const [copied, setCopied] = useState(false);
  const copyPix = async () => { if (!order.payment?.qrCode) return; await navigator.clipboard.writeText(order.payment.qrCode); setCopied(true); };
  const qrImage = order.payment?.qrCodeBase64 ? (order.payment.qrCodeBase64.startsWith("data:") ? order.payment.qrCodeBase64 : `data:image/png;base64,${order.payment.qrCodeBase64}`) : null;
  return <main className="container-shell flex min-h-[62vh] flex-col items-center justify-center py-16 text-center"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e5f7ee] text-[#157a54]"><CheckCircle2 size={48} /></span><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Pedido registrado</p><h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-5xl">Tudo certo!</h1><p className="mt-4 max-w-md text-sm leading-6 text-[#5f5852]">Recebemos seu pedido <strong>#{order.number}</strong>. O status e o pagamento podem ser acompanhados na sequência.</p>{qrImage && <div className="mt-7 rounded-3xl border border-[#e9e1d8] bg-white p-5"><p className="text-sm font-black">Pague com PIX</p><img src={qrImage} alt="QR Code para pagamento PIX" className="mx-auto mt-4 h-48 w-48" /><button type="button" onClick={() => void copyPix()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ded6cd] px-4 py-2 text-xs font-black hover:border-[#f26822]"><Copy size={14} /> {copied ? "Código copiado" : "Copiar código PIX"}</button></div>}{order.paymentMessage && <p className="mt-5 max-w-md rounded-2xl bg-[#fff8f2] px-4 py-3 text-xs font-bold text-[#8a8178]">{order.paymentMessage}</p>}<div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={`/pedido/${order.number}`} className="rounded-full bg-[#f26822] px-6 py-3 text-sm font-black text-white hover:bg-[#d94f0f]">Acompanhar pedido</Link><Link href="/" className="rounded-full border border-[#ded6cd] px-6 py-3 text-sm font-black hover:border-[#f26822]">Continuar comprando</Link></div></main>;
}
