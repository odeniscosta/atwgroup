"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, PackageCheck, Search, Truck } from "lucide-react";
import { useState } from "react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { formatCurrency } from "@/lib/format";

type TrackedOrder = {
  number: string;
  status: string;
  total: number;
  createdAt: string;
  events: Array<{ status: string; createdAt: string }>;
};

const statusLabels: Record<string, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAYMENT_PENDING: "Pagamento pendente",
  PAID: "Pagamento aprovado",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

function label(status: string) {
  return statusLabels[status] ?? status;
}

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function TrackOrderPage() {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrders([]);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: form.get("number"), email: form.get("email") }),
      });
      const result = (await response.json()) as { orders?: TrackedOrder[]; error?: string };
      if (!response.ok || !result.orders) throw new Error(result.error ?? "Não foi possível consultar o pedido.");
      setOrders(result.orders);
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : "Não foi possível consultar o pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketplaceShell>
      <main className="container-shell py-10 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8a8178] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar para a loja</Link>
        <section className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Acompanhe de perto</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">Onde está seu pedido?</h1>
          <p className="mt-5 text-sm leading-7 text-[#5f5852]">Informe o número do pedido e o e-mail usado na compra. Para pedidos multivendedor, você pode informar vários números separados por vírgula.</p>
        </section>

        <form onSubmit={submit} className="mx-auto mt-9 grid max-w-xl gap-4 rounded-3xl border border-[#eee8df] bg-white p-5 shadow-[0_18px_50px_rgba(68,44,25,0.08)] md:p-7">
          <label className="grid gap-2 text-sm font-bold">Número(s) do pedido<input required name="number" placeholder="ATW123456, ATW789012" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label>
          <label className="grid gap-2 text-sm font-bold">E-mail da compra<input required type="email" name="email" placeholder="voce@email.com" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label>
          {error && <p role="alert" className="rounded-2xl bg-[#fff0e6] p-4 text-sm font-bold text-[#b43c0d]">{error}</p>}
          <button disabled={loading} className="flex h-13 items-center justify-center gap-2 rounded-full bg-[#f26822] px-5 py-3.5 text-sm font-black text-white hover:bg-[#d94f0f] disabled:cursor-wait disabled:opacity-60"><Search size={17} />{loading ? "Consultando..." : "Consultar pedido"}</button>
        </form>

        {orders.length > 0 && <section className="mx-auto mt-8 grid max-w-xl gap-4">{orders.map((order) => <article key={order.number} className="rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-[#9b9188]">Pedido</p><h2 className="mt-1 text-xl font-black">#{order.number}</h2><p className="mt-1 text-xs text-[#8a8178]">Criado em {date(order.createdAt)}</p></div><span className="rounded-full bg-[#e5f7ee] px-3 py-1.5 text-xs font-black text-[#157a54]">{label(order.status)}</span></div><div className="mt-6 flex items-center justify-between border-y border-[#f1ece5] py-4"><span className="text-sm text-[#5f5852]">Total</span><strong className="text-lg">{formatCurrency(order.total)}</strong></div><ol className="mt-6 grid gap-4">{order.events.map((event, index) => <li key={`${event.status}-${event.createdAt}`} className="flex gap-3"><span className={"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " + (index === order.events.length - 1 ? "bg-[#fff0e6] text-[#f26822]" : "bg-[#f8f4ee] text-[#8a8178]")}>{index === order.events.length - 1 ? <Truck size={16} /> : index === 0 ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}</span><span><strong className="block text-sm">{label(event.status)}</strong><small className="text-xs text-[#8a8178]">{date(event.createdAt)}</small></span></li>)}</ol><p className="mt-6 flex items-center gap-2 text-xs text-[#8a8178]"><PackageCheck size={15} /> Você pode consultar este pedido novamente quando quiser.</p></article>)}</section>}
      </main>
    </MarketplaceShell>
  );
}
