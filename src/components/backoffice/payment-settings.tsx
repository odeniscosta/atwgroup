"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Eye, EyeOff, KeyRound, Link2, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";

type DisplaySettings = {
  mpAccessToken: string | null;
  mpPublicKey: string | null;
  mpWebhookSecret: string | null;
  mpPreenchido: boolean;
  mpValidado: boolean;
};

type ApiResponse = { configuracao?: DisplaySettings; ok?: boolean; erro?: string; error?: string };

async function api<T extends ApiResponse>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(data.error ?? data.erro ?? "Não foi possível concluir a operação.");
  return data;
}

export function PaymentSettingsPanel() {
  const [config, setConfig] = useState<DisplaySettings | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ configuracao: DisplaySettings }>("/api/admin/configuracoes", { cache: "no-store" });
      setConfig(data.configuracao);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao carregar a configuração." });
    } finally {
      setLoading(false);
    }
  }, []);

  // A página é protegida no servidor; a API também revalida ADMIN a cada chamada.
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!accessToken && !publicKey && !webhookSecret) {
      setMessage({ type: "error", text: "Informe ao menos uma credencial para salvar." });
      return;
    }
    setSaving(true);
    try {
      const data = await api<{ configuracao: DisplaySettings }>("/api/admin/configuracoes", { method: "PUT", body: JSON.stringify({ accessToken: accessToken || undefined, publicKey: publicKey || undefined, webhookSecret: webhookSecret || undefined }) });
      setConfig(data.configuracao);
      setAccessToken("");
      setPublicKey("");
      setWebhookSecret("");
      setMessage({ type: "success", text: "Credenciais salvas com segurança. Agora valide o Access Token." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao salvar as credenciais." });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setMessage(null);
    setTesting(true);
    try {
      const data = await api<{ ok: boolean; erro?: string }>("/api/admin/configuracoes/testar-mp", { method: "POST", body: JSON.stringify(accessToken ? { accessToken } : {}) });
      setMessage(data.ok ? { type: "success", text: "Access Token válido. O Mercado Pago aceitou a credencial." } : { type: "error", text: data.erro || "Access Token inválido." });
      if (data.ok) await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao testar o Mercado Pago." });
    } finally {
      setTesting(false);
    }
  }

  async function clear() {
    if (!window.confirm("Remover as credenciais salvas do Mercado Pago? Os pagamentos ficarão indisponíveis até um novo cadastro.")) return;
    setMessage(null);
    setClearing(true);
    try {
      const data = await api<{ configuracao: DisplaySettings }>("/api/admin/configuracoes/limpar-mp", { method: "POST" });
      setConfig(data.configuracao);
      setMessage({ type: "success", text: "Credenciais removidas." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao remover as credenciais." });
    } finally {
      setClearing(false);
    }
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(`${window.location.origin}/api/payments/webhook`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const webhookUrl = typeof window === "undefined" ? "/api/payments/webhook" : `${window.location.origin}/api/payments/webhook`;
  const status = config?.mpValidado && config.mpPreenchido ? { tone: "success", text: "Configurado e validado com o Mercado Pago." } : config?.mpPreenchido ? { tone: "warning", text: "Credenciais preenchidas, mas ainda não validadas." } : { tone: "muted", text: "Ainda não configurado." };
  const inputType = showSecrets ? "text" : "password";

  return <main className="min-h-screen bg-[#f8f4ee] px-4 py-8 md:px-8 md:py-12"><div className="mx-auto max-w-3xl"><Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[#887d73] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar ao painel</Link><div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">ATW Group · Configurações</p><h1 className="mt-2 text-4xl font-black tracking-[-0.07em] text-[#16120f]">Mercado Pago</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e655d]">Conecte a conta Mercado Pago da operação para gerar pagamentos e receber as confirmações do webhook.</p></div><ShieldCheck className="hidden text-[#f26822] sm:block" size={34} /></div>{message && <div role={message.type === "error" ? "alert" : "status"} className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${message.type === "error" ? "border-[#f4c9b1] bg-[#fff0e6] text-[#a53a10]" : "border-[#bde4cf] bg-[#eaf8f0] text-[#157a54]"}`}><Check size={18} />{message.text}</div>}<section className="mt-7 rounded-3xl border border-[#e9e1d8] bg-white p-6 shadow-[0_18px_50px_rgba(68,44,25,0.06)] md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Credenciais da integração</h2><p className="mt-1 text-sm text-[#887d73]">Use credenciais de teste para homologação e de produção para cobrar clientes.</p></div>{loading ? <LoaderCircle className="animate-spin text-[#f26822]" size={20} /> : <span className={`rounded-full px-3 py-1 text-xs font-black ${status.tone === "success" ? "bg-[#eaf8f0] text-[#157a54]" : status.tone === "warning" ? "bg-[#fff6df] text-[#9a6a00]" : "bg-[#f8f4ee] text-[#887d73]"}`}>{status.text}</span>}</div><p className="mt-5 rounded-2xl bg-[#fff8f2] p-4 text-xs leading-5 text-[#6e655d]">As credenciais salvas ficam criptografadas no banco. Os valores atuais são exibidos apenas mascarados. Para substituir um campo, preencha-o; deixe em branco para manter o valor atual.</p><div className="mt-5 flex justify-end"><button type="button" onClick={() => setShowSecrets((value) => !value)} className="inline-flex items-center gap-2 text-xs font-black text-[#f26822]">{showSecrets ? <EyeOff size={15} /> : <Eye size={15} />}{showSecrets ? "Ocultar texto digitado" : "Exibir texto digitado"}</button></div><form onSubmit={save} className="mt-2 grid gap-4"><CredentialField id="mpAccessToken" label="Access Token" current={config?.mpAccessToken} value={accessToken} onChange={setAccessToken} type={inputType} placeholder="APP_USR-..." hint="Token privado da conta. Nunca o compartilhe no frontend." /><CredentialField id="mpPublicKey" label="Public Key" current={config?.mpPublicKey} value={publicKey} onChange={setPublicKey} type={inputType} placeholder="APP_USR-..." hint="Chave pública usada pelo SDK do Mercado Pago quando o cartão for habilitado." /><CredentialField id="mpWebhookSecret" label="Webhook Secret" current={config?.mpWebhookSecret} value={webhookSecret} onChange={setWebhookSecret} type={inputType} placeholder="Assinatura secreta do webhook" hint="Use a assinatura secreta exibida na configuração de Webhooks do Mercado Pago." /><div className="mt-2 flex flex-wrap gap-3"><button type="submit" disabled={saving || testing} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f26822] px-5 text-sm font-black text-white hover:bg-[#d94f0f] disabled:opacity-50"><KeyRound size={16} />{saving ? "Salvando..." : "Salvar credenciais"}</button><button type="button" onClick={() => void test()} disabled={saving || testing || clearing} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ded6cd] px-5 text-sm font-black text-[#4d443d] hover:border-[#f26822] disabled:opacity-50">{testing ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}{testing ? "Testando..." : "Testar Access Token"}</button>{config?.mpPreenchido && <button type="button" onClick={() => void clear()} disabled={saving || testing || clearing} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#f4c9b1] px-5 text-sm font-black text-[#a53a10] hover:bg-[#fff0e6] disabled:opacity-50"><Trash2 size={16} />{clearing ? "Removendo..." : "Remover credenciais"}</button>}</div></form></section><section className="mt-6 rounded-3xl border border-[#e9e1d8] bg-white p-6 md:p-8"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Webhook de pagamentos</h2><p className="mt-1 text-sm leading-6 text-[#887d73]">No painel do Mercado Pago, configure o evento de pagamento para esta URL. A aplicação valida a assinatura, rejeita payloads antigos e atualiza o pedido de forma idempotente.</p></div><Link2 className="shrink-0 text-[#f26822]" size={22} /></div><div className="mt-5 flex flex-col gap-2 sm:flex-row"><input aria-label="URL do webhook" value={webhookUrl} readOnly className="h-11 min-w-0 flex-1 rounded-xl border border-[#ded6cd] bg-[#f8f4ee] px-3 text-xs text-[#5f5852] outline-none" /><button type="button" onClick={() => void copyWebhook()} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#ded6cd] px-4 text-xs font-black text-[#4d443d] hover:border-[#f26822]"><Copy size={15} />{copied ? "Copiado" : "Copiar URL"}</button></div><p className="mt-4 text-xs leading-5 text-[#887d73]">O Webhook Secret acima precisa ser o mesmo segredo configurado no Mercado Pago. Não registre essa URL junto com o segredo em chamados ou logs públicos.</p></section></div></main>;
}

function CredentialField({ id, label, current, value, onChange, type, placeholder, hint }: Readonly<{ id: string; label: string; current?: string | null; value: string; onChange: (value: string) => void; type: "text" | "password"; placeholder: string; hint: string }>) {
  return <label htmlFor={id} className="grid gap-2 text-xs font-black text-[#514840]"><span className="flex flex-wrap items-center justify-between gap-2"><span>{label}</span><span className="font-normal text-[#887d73]">Atual: {current || "não configurado"}</span></span><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={512} autoComplete="off" className="h-12 rounded-xl border border-[#ded6cd] bg-white px-4 text-sm font-normal text-[#302a25] outline-none focus:border-[#f26822] focus:ring-4 focus:ring-[#f26822]/10" /><span className="font-normal leading-5 text-[#887d73]">{hint}</span></label>;
}
