"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, Copy, LockKeyhole, Ticket, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { RafflePublic } from "@/server/raffles";

type Payment = { status: string; qrCode?: string; qrCodeBase64?: string };
type CompletedOrder = { number: string; numbers: number[]; total: number; expiresAt: string; payment?: Payment };
const pageSize = 100;

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function drawLabel(value: string | null) {
  if (!value) return "Sorteio após encerramento";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RaffleDetail({ raffle }: Readonly<{ raffle: RafflePublic }>) {
  const [selected, setSelected] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);
  const occupied = useMemo(() => new Set(raffle.occupiedNumbers), [raffle.occupiedNumbers]);
  const pageCount = Math.ceil(raffle.totalNumbers / pageSize);
  const firstNumber = currentPage * pageSize + 1;
  const lastNumber = Math.min(raffle.totalNumbers, firstNumber + pageSize - 1);
  const numbers = Array.from({ length: lastNumber - firstNumber + 1 }, (_, index) => firstNumber + index);
  const total = selected.length * raffle.ticketPrice;
  const qrImage = completed?.payment?.qrCodeBase64 ? (completed.payment.qrCodeBase64.startsWith("data:") ? completed.payment.qrCodeBase64 : `data:image/png;base64,${completed.payment.qrCodeBase64}`) : null;

  function toggleNumber(number: number) {
    if (occupied.has(number) || raffle.status !== "OPEN") return;
    setError("");
    setSelected((current) => {
      if (current.includes(number)) return current.filter((item) => item !== number);
      if (current.length >= raffle.maxPerCustomer) { setError(`Você pode escolher no máximo ${raffle.maxPerCustomer} número(s).`); return current; }
      return [...current, number].sort((first, second) => first - second);
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length) { setError("Escolha ao menos um número para continuar."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/raffles/${raffle.slug}/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, phone, numbers: selected }) });
      const result = await response.json() as { order?: CompletedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error ?? "Não foi possível reservar os números.");
      setCompleted(result.order);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível reservar os números.");
    } finally {
      setLoading(false);
    }
  }

  if (completed) return <RaffleOrderComplete order={completed} raffleTitle={raffle.title} qrImage={qrImage} />;

  return (
    <main className="container-shell py-8 md:py-12">
      <Link href="/rifas" className="inline-flex items-center gap-2 text-sm font-bold text-[#8a8178] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar para rifas</Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_390px]">
        <section>
          <div className="rounded-3xl bg-[radial-gradient(circle_at_20%_20%,#ffb77f,transparent_42%),linear-gradient(135deg,#f26822,#17120f)] p-7 text-white md:p-10"><Ticket size={50} strokeWidth={1.4} /><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[#ffd0b5]">Rifa ATW Group</p><h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">{raffle.title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">{raffle.description ?? "Escolha seus números e participe."}</p></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><Info label="Valor por número" value={currency(raffle.ticketPrice)} /><Info label="Disponíveis" value={`${raffle.availableCount}/${raffle.totalNumbers}`} /><Info label="Sorteio" value={drawLabel(raffle.drawAt)} /></div>
          {raffle.status === "DRAWN" && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#bde4cf] bg-[#eaf8f0] p-4 text-sm font-bold text-[#157a54]"><Trophy size={20} /> Número sorteado: {raffle.winningNumber}</div>}
          <section className="mt-7 rounded-3xl border border-[#eee8df] bg-white p-5 md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#f26822]">Seleção de números</p><h2 className="mt-2 text-2xl font-black">Escolha até {raffle.maxPerCustomer}</h2></div><p className="text-sm font-bold text-[#157a54]">{selected.length} selecionado(s)</p></div><div className="mt-5 flex flex-wrap gap-2 text-xs text-[#6e655d]"><span className="rounded-full bg-[#f8f4ee] px-3 py-1.5">Disponível</span><span className="rounded-full bg-[#16120f] px-3 py-1.5 text-white">Selecionado</span><span className="rounded-full bg-[#e9e1d8] px-3 py-1.5">Ocupado</span></div><div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">{numbers.map((number) => { const isOccupied = occupied.has(number); const isSelected = selected.includes(number); return <button key={number} type="button" disabled={isOccupied || raffle.status !== "OPEN"} onClick={() => toggleNumber(number)} className={`h-10 rounded-xl text-xs font-black transition ${isSelected ? "bg-[#16120f] text-white" : isOccupied ? "cursor-not-allowed bg-[#e9e1d8] text-[#9b9188]" : "border border-[#ded6cd] bg-white text-[#514840] hover:border-[#f26822] hover:text-[#f26822]"}`}>{String(number).padStart(String(raffle.totalNumbers).length, "0")}</button>; })}</div><div className="mt-6 flex items-center justify-between gap-3"><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((page) => page - 1)} className="rounded-full border border-[#ded6cd] px-4 py-2 text-xs font-black disabled:opacity-40">Anterior</button><span className="text-xs font-bold text-[#8a8178]">Página {currentPage + 1} de {pageCount}</span><button type="button" disabled={currentPage === pageCount - 1} onClick={() => setCurrentPage((page) => page + 1)} className="rounded-full border border-[#ded6cd] px-4 py-2 text-xs font-black disabled:opacity-40">Próxima</button></div></section>
        </section>
        <form onSubmit={submit} className="h-fit rounded-3xl bg-[#16120f] p-6 text-white lg:sticky lg:top-28 md:p-7"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff9a67]">Pagamento seguro</p><h2 className="mt-2 text-2xl font-black">Reserve seus números</h2><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-bold">Nome completo<input required value={name} onChange={(event) => setName(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-white/10 px-4 font-normal text-white outline-none placeholder:text-white/35 focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-white/10 px-4 font-normal text-white outline-none placeholder:text-white/35 focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">WhatsApp<input required value={phone} onChange={(event) => setPhone(event.target.value)} className="h-12 rounded-xl border border-white/15 bg-white/10 px-4 font-normal text-white outline-none placeholder:text-white/35 focus:border-[#f26822]" /></label></div><div className="mt-6 border-y border-white/10 py-5"><div className="flex justify-between text-sm text-white/60"><span>Números</span><span>{selected.length}</span></div><div className="mt-3 flex justify-between text-xl font-black"><span>Total PIX</span><span>{currency(total)}</span></div></div>{error && <p role="alert" className="mt-5 rounded-2xl bg-[#7d2c16] p-4 text-sm font-bold text-[#ffd7c4]">{error}</p>}<button disabled={loading || raffle.status !== "OPEN"} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#f26822] px-5 py-3.5 text-sm font-black text-white hover:bg-[#ff8142] disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Reservando..." : raffle.status === "OPEN" ? "Gerar PIX e reservar" : "Rifa encerrada"}</button><p className="mt-4 flex items-center gap-2 text-xs leading-5 text-white/45"><LockKeyhole size={14} /> A reserva fica válida por 15 minutos. O pagamento é somente via PIX.</p></form>
      </div>
    </main>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-2xl border border-[#eee8df] bg-white p-4"><p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#9b9188]">{label}</p><p className="mt-2 text-sm font-black text-[#302a25]">{value}</p></div>; }

function RaffleOrderComplete({ order, raffleTitle, qrImage }: Readonly<{ order: CompletedOrder; raffleTitle: string; qrImage: string | null }>) {
  const [copied, setCopied] = useState(false);
  async function copyPix() { if (!order.payment?.qrCode) return; await navigator.clipboard.writeText(order.payment.qrCode); setCopied(true); }
  return <main className="container-shell flex min-h-[62vh] flex-col items-center justify-center py-16 text-center"><span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#e5f7ee] text-[#157a54]"><CheckCircle2 size={48} /></span><p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Rifa · {raffleTitle}</p><h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-5xl">Números reservados!</h1><p className="mt-4 max-w-md text-sm leading-6 text-[#5f5852]">Pedido <strong>#{order.number}</strong> · números {order.numbers.join(", ")}.</p>{qrImage && <div className="mt-7 rounded-3xl border border-[#e9e1d8] bg-white p-5"><p className="text-sm font-black">Pague com PIX</p><Image src={qrImage} alt="QR Code para pagamento PIX da rifa" width={192} height={192} unoptimized className="mx-auto mt-4" /><button type="button" onClick={() => void copyPix()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ded6cd] px-4 py-2 text-xs font-black hover:border-[#f26822]"><Copy size={14} /> {copied ? "Código copiado" : "Copiar código PIX"}</button></div>}<p className="mt-5 rounded-2xl bg-[#fff8f2] px-4 py-3 text-xs font-bold text-[#8a8178]">A reserva expira em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(order.expiresAt))} se o PIX não for confirmado.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href={`/acompanhar-pedido?numero=${encodeURIComponent(order.number)}`} className="rounded-full bg-[#f26822] px-6 py-3 text-sm font-black text-white">Acompanhar pedido</Link><Link href="/rifas" className="rounded-full border border-[#ded6cd] px-6 py-3 text-sm font-black hover:border-[#f26822]">Ver outras rifas</Link></div></main>;
}
