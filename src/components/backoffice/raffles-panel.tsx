"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CircleAlert, Dices, Edit3, Save, Ticket, X } from "lucide-react";

type Role = "ADMIN" | "MANAGER";
type Raffle = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  ticketPrice: number;
  totalNumbers: number;
  maxPerCustomer: number;
  drawAt: string | null;
  status: string;
  winningNumber: number | null;
  category: { id: string; name: string; slug: string };
  soldCount: number;
  reservedCount: number;
  availableCount: number;
};
type RaffleOrder = {
  number: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  raffle: { title: string; slug: string };
  tickets: Array<{ number: number; status: string }>;
};
type RaffleForm = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string;
  ticketPrice: string;
  totalNumbers: string;
  maxPerCustomer: string;
  drawAt: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inputClass = "h-11 rounded-xl border border-[#ded6cd] bg-white px-3 text-sm font-normal text-[#302a25] outline-none focus:border-[#f26822] focus:ring-4 focus:ring-[#f26822]/10";

function emptyForm(): RaffleForm {
  return { title: "", slug: "", description: "", imageUrl: "", ticketPrice: "", totalNumbers: "100", maxPerCustomer: "10", drawAt: "" };
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLocaleLowerCase("pt-BR").replace(/(^| )\S/g, (letter) => letter.toUpperCase());
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formFromRaffle(raffle: Raffle): RaffleForm {
  return {
    id: raffle.id,
    title: raffle.title,
    slug: raffle.slug,
    description: raffle.description ?? "",
    imageUrl: raffle.imageUrl ?? "",
    ticketPrice: String(raffle.ticketPrice),
    totalNumbers: String(raffle.totalNumbers),
    maxPerCustomer: String(raffle.maxPerCustomer),
    drawAt: localDateTime(raffle.drawAt),
  };
}

function nextStatuses(status: string) {
  if (status === "DRAFT") return ["OPEN", "CANCELLED"];
  if (status === "OPEN") return ["PAUSED", "CANCELLED"];
  if (status === "PAUSED") return ["OPEN", "CANCELLED"];
  return [];
}

export function RafflesPanel({ role }: Readonly<{ role: Role }>) {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [orders, setOrders] = useState<RaffleOrder[]>([]);
  const [selectedRaffleId, setSelectedRaffleId] = useState("");
  const [form, setForm] = useState<RaffleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function api<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a operação.");
    return data as T;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ raffles: Raffle[] }>("/api/admin/raffles");
      setRaffles(result.raffles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar as rifas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders(raffleId: string) {
    setError("");
    try {
      const result = await api<{ orders: RaffleOrder[] }>(`/api/admin/raffles/orders?raffleId=${encodeURIComponent(raffleId)}`);
      setOrders(result.orders);
      setSelectedRaffleId(raffleId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar as reservas da rifa.");
    }
  }

  // A aba sincroniza seus dados somente quando é montada no painel autenticado.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, []);

  async function mutate(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setForm(emptyForm());
      setNotice(message);
      await load();
      if (selectedRaffleId) await loadOrders(selectedRaffleId);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Falha ao salvar a rifa.");
    } finally {
      setBusy(false);
    }
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate(async () => {
      const payload = { ...form, ticketPrice: Number(form.ticketPrice), totalNumbers: Number(form.totalNumbers), maxPerCustomer: Number(form.maxPerCustomer), imageUrl: form.imageUrl || undefined, drawAt: form.drawAt || undefined };
      await api(form.id ? `/api/admin/raffles/${form.id}` : "/api/admin/raffles", { method: form.id ? "PATCH" : "POST", body: JSON.stringify(payload) });
    }, form.id ? "Rifa atualizada." : "Rifa criada como rascunho.");
  }

  function changeStatus(raffle: Raffle, status: string) {
    const message = status === "CANCELLED" ? "Cancelar esta rifa e impedir novas reservas?" : `Alterar a rifa para ${statusLabel(status)}?`;
    if (!window.confirm(message)) return;
    void mutate(async () => {
      await api(`/api/admin/raffles/${raffle.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    }, `Status alterado para ${statusLabel(status)}.`);
  }

  function draw(raffle: Raffle) {
    if (!window.confirm(`Confirmar o sorteio de “${raffle.title}”? Esta ação é irreversível.`)) return;
    void mutate(async () => {
      const result = await api<{ winningNumber: number }>(`/api/admin/raffles/${raffle.id}/draw`, { method: "POST" });
      setNotice(`Sorteio concluído. Número vencedor: ${String(result.winningNumber).padStart(4, "0")}.`);
    }, "Sorteio concluído.");
  }

  return (
    <section className="mt-7 grid gap-6 xl:grid-cols-[390px_1fr]">
      <form onSubmit={save} className="h-fit rounded-3xl border border-[#e9e1d8] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-black">{form.id ? "Editar rifa" : "Nova rifa"}</h2><p className="mt-1 text-xs leading-5 text-[#887d73]">A categoria Rifas é aplicada automaticamente. O checkout aceita somente PIX.</p></div>
          {form.id && <button type="button" onClick={() => setForm(emptyForm())} className="text-[#f26822]" aria-label="Cancelar edição"><X size={18} /></button>}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-black text-[#514840] sm:col-span-2">Título<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840] sm:col-span-2">Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="rifa-cesta-especial" className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840]">Valor por número<input required type="number" min="0.01" step="0.01" value={form.ticketPrice} onChange={(event) => setForm({ ...form, ticketPrice: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840]">Quantidade de números<input required type="number" min="2" max="10000" step="1" value={form.totalNumbers} onChange={(event) => setForm({ ...form, totalNumbers: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840]">Limite por participante<input required type="number" min="1" step="1" value={form.maxPerCustomer} onChange={(event) => setForm({ ...form, maxPerCustomer: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840]">Data do sorteio<input type="datetime-local" value={form.drawAt} onChange={(event) => setForm({ ...form, drawAt: event.target.value })} className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840] sm:col-span-2">Imagem HTTPS<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." className={inputClass} /></label>
          <label className="grid gap-2 text-xs font-black text-[#514840] sm:col-span-2">Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${inputClass} h-28 py-3`} /></label>
        </div>
        <button disabled={busy} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f26822] text-sm font-black text-white hover:bg-[#d94f0f] disabled:opacity-50"><Save size={16} />{busy ? "Salvando..." : form.id ? "Salvar rifa" : "Criar rifa"}</button>
      </form>

      <div className="rounded-3xl border border-[#e9e1d8] bg-white p-6">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-black">Campanhas de rifas</h2><p className="mt-1 text-sm text-[#887d73]">Crie, abra reservas, acompanhe o PIX e realize o sorteio.</p></div><Ticket className="text-[#f26822]" /></div>
        {error && <div role="alert" className="mt-5 flex items-center gap-2 rounded-2xl border border-[#f4c9b1] bg-[#fff0e6] p-4 text-sm font-bold text-[#a53a10]"><CircleAlert size={17} />{error}</div>}
        {notice && <p role="status" className="mt-5 rounded-2xl border border-[#bde4cf] bg-[#eaf8f0] p-4 text-sm font-bold text-[#157a54]">{notice}</p>}
        {loading ? <div className="mt-6 grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#f8f4ee]" />)}</div> : raffles.length ? <div className="mt-6 grid gap-4">{raffles.map((raffle) => {
          const actions = nextStatuses(raffle.status);
          return <article key={raffle.id} className="rounded-2xl border border-[#eee8df] bg-[#fffdf9] p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#fff0e6] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-[#b43c0d]">Rifas</span><span className="rounded-full bg-[#f8f4ee] px-2.5 py-1 text-xs font-bold">{statusLabel(raffle.status)}</span></div><h3 className="mt-3 text-lg font-black">{raffle.title}</h3><p className="mt-1 text-xs text-[#887d73]">/{raffle.slug} · {currency.format(raffle.ticketPrice)} por número · até {raffle.maxPerCustomer} por participante</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => setForm(formFromRaffle(raffle))} disabled={busy || raffle.status === "DRAWN" || raffle.status === "CANCELLED"} className="inline-flex items-center gap-1 text-xs font-black text-[#f26822] disabled:opacity-40"><Edit3 size={14} /> Editar</button>{role === "ADMIN" && (raffle.status === "OPEN" || raffle.status === "PAUSED") && raffle.soldCount > 0 && <button type="button" onClick={() => draw(raffle)} disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-[#16120f] px-3 py-2 text-xs font-black text-white disabled:opacity-50"><Dices size={14} /> Sortear</button>}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Vendidos" value={raffle.soldCount} /><Metric label="Reservados" value={raffle.reservedCount} /><Metric label="Disponíveis" value={raffle.availableCount} /><Metric label="Total" value={raffle.totalNumbers} /></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ebe5] pt-4"><p className="flex items-center gap-2 text-xs text-[#887d73]"><CalendarClock size={15} />{raffle.drawAt ? `Sorteio: ${new Date(raffle.drawAt).toLocaleString("pt-BR")}` : "Sorteio sem data definida"}{raffle.winningNumber !== null && ` · vencedor: ${String(raffle.winningNumber).padStart(4, "0")}`}</p><div className="flex flex-wrap items-center gap-3">{raffle.soldCount + raffle.reservedCount > 0 && <button type="button" onClick={() => void loadOrders(raffle.id)} disabled={busy} className="text-xs font-black text-[#f26822] disabled:opacity-50">{selectedRaffleId === raffle.id ? "Atualizar reservas" : "Ver reservas"}</button>}{actions.length > 0 && <select aria-label={`Alterar status de ${raffle.title}`} value="" onChange={(event) => { if (event.target.value) changeStatus(raffle, event.target.value); }} disabled={busy} className="h-9 rounded-lg border border-[#ded6cd] bg-white px-2 text-xs font-bold"><option value="">Alterar status...</option>{actions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>}</div></div>
          </article>;
        })}</div> : <div className="py-16 text-center"><Ticket className="mx-auto text-[#d8cec4]" size={34} /><h3 className="mt-4 text-base font-black text-[#514840]">Nenhuma rifa cadastrada</h3><p className="mt-1 text-sm text-[#887d73]">Crie a primeira campanha no formulário ao lado.</p></div>}
        {selectedRaffleId && <section className="mt-6 rounded-2xl border border-[#eee8df] bg-[#fffdf9] p-4 md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Reservas e participantes</h2><p className="mt-1 text-xs text-[#887d73]">Dados da campanha selecionada, separados dos pedidos de produtos.</p></div><button type="button" onClick={() => { setSelectedRaffleId(""); setOrders([]); }} className="text-xs font-black text-[#f26822]">Fechar</button></div>{orders.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#eee8df] text-[10px] uppercase tracking-[0.1em] text-[#887d73]"><tr><th className="pb-3 pr-4">Pedido</th><th className="pb-3 pr-4">Participante</th><th className="pb-3 pr-4">Números</th><th className="pb-3 pr-4">Total</th><th className="pb-3">Status</th></tr></thead><tbody className="divide-y divide-[#f0ebe5]">{orders.map((order) => <tr key={order.number}><td className="py-3 pr-4"><strong>#{order.number}</strong><small className="mt-1 block text-xs text-[#887d73]">{new Date(order.createdAt).toLocaleString("pt-BR")}</small></td><td className="py-3 pr-4"><strong className="block">{order.buyerName}</strong><small className="block text-xs text-[#887d73]">{order.buyerEmail} · {order.buyerPhone}</small></td><td className="py-3 pr-4 text-xs font-bold">{order.tickets.map((ticket) => String(ticket.number).padStart(4, "0")).join(", ")}</td><td className="py-3 pr-4 font-bold">{currency.format(order.total)}</td><td className="py-3"><span className="rounded-full bg-[#f8f4ee] px-2.5 py-1 text-xs font-bold">{statusLabel(order.status)}</span></td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-[#887d73]">Nenhuma reserva encontrada.</p>}</section>}
      </div>
    </section>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="rounded-xl bg-[#f8f4ee] px-3 py-2"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#887d73]">{label}</p><p className="mt-1 text-lg font-black text-[#16120f]">{value.toLocaleString("pt-BR")}</p></div>;
}
