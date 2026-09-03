import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Ticket, Trophy } from "lucide-react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import type { RafflePublic } from "@/server/raffles";

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function drawLabel(value: string | null) {
  if (!value) return "Sorteio após encerramento";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RaffleListing({ raffles }: Readonly<{ raffles: RafflePublic[] }>) {
  return (
    <MarketplaceShell>
      <main className="container-shell py-10 md:py-16">
        <section className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">ATW Group · Rifas</p>
          <h1 className="mt-3 text-balance text-4xl font-black leading-[0.98] tracking-[-0.07em] md:text-6xl">Escolha seu número e concorra.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#5f5852] md:text-base">Campanhas oficiais da ATW Group com reserva segura e pagamento exclusivamente via PIX.</p>
        </section>

        {raffles.length ? (
          <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {raffles.map((raffle) => (
              <article key={raffle.id} className="overflow-hidden rounded-3xl border border-[#eee8df] bg-white shadow-[0_16px_40px_rgba(68,44,25,0.07)]">
                <div className="relative flex h-36 items-center justify-between overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#ffb77f,transparent_45%),linear-gradient(135deg,#f26822,#17120f)] p-6 text-white">
                  {raffle.images[0]?.url || raffle.imageUrl ? <Image src={raffle.images[0]?.url ?? raffle.imageUrl ?? ""} alt={raffle.images[0]?.alt ?? raffle.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /> : <Ticket size={54} strokeWidth={1.4} />}
                  <span className="relative ml-auto rounded-full bg-black/30 px-3 py-1 text-xs font-black">{raffle.availableCount} disponíveis</span>
                </div>
                <div className="p-6">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f26822]">{raffle.soldCount} números pagos</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">{raffle.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6e655d]">{raffle.description ?? "Participe desta rifa da ATW Group."}</p>
                  <div className="mt-5 grid gap-2 border-y border-[#f0ebe5] py-4 text-xs text-[#6e655d]">
                    <span className="flex items-center gap-2"><Ticket size={15} className="text-[#f26822]" /> Cada número: <strong className="text-[#302a25]">{currency(raffle.ticketPrice)}</strong></span>
                    <span className="flex items-center gap-2"><CalendarDays size={15} className="text-[#f26822]" /> {drawLabel(raffle.drawAt)}</span>
                  </div>
                  <Link href={`/rifa/${raffle.slug}`} className="mt-5 flex items-center justify-center gap-2 rounded-full bg-[#f26822] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#d94f0f]">Escolher números <ArrowRight size={17} /></Link>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-10 rounded-3xl border border-[#eee8df] bg-white p-10 text-center">
            <Trophy className="mx-auto text-[#f26822]" size={42} />
            <h2 className="mt-5 text-2xl font-black">Nenhuma rifa aberta agora</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e655d]">Novas campanhas aparecerão aqui quando forem abertas pela administração.</p>
          </section>
        )}
      </main>
    </MarketplaceShell>
  );
}
