"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, LoaderCircle, Mail, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";

type NotificationDisplay = {
  smtp: { host: string | null; port: number; user: string | null; password: string | null; from: string | null; secure: boolean; preenchido: boolean; validado: boolean };
  whatsapp: { apiUrl: string | null; apiKey: string | null; instance: string | null; adminPhone: string | null; enabled: boolean; preenchido: boolean; prontoParaNotificar: boolean; validado: boolean };
};

type ApiResponse = { configuracao?: NotificationDisplay; ok?: boolean; estado?: string; erro?: string; error?: string };

async function api<T extends ApiResponse>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(data.error ?? data.erro ?? "Não foi possível concluir a operação.");
  return data;
}

type Message = { type: "success" | "error"; text: string } | null;

export function NotificationSettingsPanel() {
  const [config, setConfig] = useState<NotificationDisplay | null>(null);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [whatsappApiUrl, setWhatsappApiUrl] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [whatsappInstance, setWhatsappInstance] = useState("");
  const [whatsappAdminPhone, setWhatsappAdminPhone] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [testNumber, setTestNumber] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [clearingSmtp, setClearingSmtp] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [clearingWhatsapp, setClearingWhatsapp] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<Message>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<Message>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ configuracao: NotificationDisplay }>("/api/admin/configuracoes/notificacoes", { cache: "no-store" });
      const next = data.configuracao;
      setConfig(next);
      setSmtpHost(next.smtp.host ?? "");
      setSmtpPort(String(next.smtp.port || 465));
      setSmtpUser(next.smtp.user ?? "");
      setSmtpFrom(next.smtp.from ?? "");
      setSmtpSecure(next.smtp.secure);
      setWhatsappApiUrl(next.whatsapp.apiUrl ?? "");
      setWhatsappInstance(next.whatsapp.instance ?? "");
      setWhatsappAdminPhone(next.whatsapp.adminPhone ?? "");
      setWhatsappEnabled(next.whatsapp.enabled);
    } catch (error) {
      setSmtpMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao carregar as configurações." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function applyConfig(next: NotificationDisplay | undefined) {
    if (!next) return;
    setConfig(next);
    setSmtpHost(next.smtp.host ?? "");
    setSmtpPort(String(next.smtp.port || 465));
    setSmtpUser(next.smtp.user ?? "");
    setSmtpFrom(next.smtp.from ?? "");
    setSmtpSecure(next.smtp.secure);
    setWhatsappApiUrl(next.whatsapp.apiUrl ?? "");
    setWhatsappInstance(next.whatsapp.instance ?? "");
    setWhatsappAdminPhone(next.whatsapp.adminPhone ?? "");
    setWhatsappEnabled(next.whatsapp.enabled);
  }

  async function saveSmtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSmtpMessage(null);
    if (!smtpHost || !smtpUser || (!smtpPassword && !config?.smtp.preenchido)) {
      setSmtpMessage({ type: "error", text: "Informe host, usuário e senha do SMTP para a primeira configuração." });
      return;
    }
    setSavingSmtp(true);
    try {
      const data = await api<{ configuracao: NotificationDisplay }>("/api/admin/configuracoes/notificacoes", { method: "PUT", body: JSON.stringify({ smtp: { host: smtpHost, port: Number(smtpPort), user: smtpUser, password: smtpPassword || undefined, from: smtpFrom || undefined, secure: smtpSecure } }) });
      applyConfig(data.configuracao);
      setSmtpPassword("");
      setSmtpMessage({ type: "success", text: "Configuração SMTP salva com segurança. Teste a conexão antes de usar." });
    } catch (error) {
      setSmtpMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao salvar o SMTP." });
    } finally {
      setSavingSmtp(false);
    }
  }

  async function testSmtp() {
    setSmtpMessage(null);
    setTestingSmtp(true);
    try {
      const data = await api<{ ok: boolean; erro?: string }>("/api/admin/configuracoes/notificacoes/testar-smtp", { method: "POST" });
      setSmtpMessage(data.ok ? { type: "success", text: "Conexão SMTP validada com sucesso." } : { type: "error", text: data.erro ?? "Não foi possível validar o SMTP." });
      if (data.ok) await load();
    } catch (error) {
      setSmtpMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao testar o SMTP." });
    } finally {
      setTestingSmtp(false);
    }
  }

  async function clearSmtp() {
    if (!window.confirm("Remover toda a configuração SMTP? O envio de e-mails ficará indisponível até um novo cadastro.")) return;
    setClearingSmtp(true);
    setSmtpMessage(null);
    try {
      const data = await api<{ configuracao: NotificationDisplay }>("/api/admin/configuracoes/notificacoes/limpar-smtp", { method: "POST" });
      applyConfig(data.configuracao);
      setSmtpPassword("");
      setSmtpMessage({ type: "success", text: "Configuração SMTP removida." });
    } catch (error) {
      setSmtpMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao remover o SMTP." });
    } finally {
      setClearingSmtp(false);
    }
  }

  async function saveWhatsapp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWhatsappMessage(null);
    if (!whatsappApiUrl || !whatsappInstance || (!whatsappApiKey && !config?.whatsapp.preenchido)) {
      setWhatsappMessage({ type: "error", text: "Informe URL, instância e chave da Evolution API para a primeira configuração." });
      return;
    }
    setSavingWhatsapp(true);
    try {
      const data = await api<{ configuracao: NotificationDisplay }>("/api/admin/configuracoes/notificacoes", { method: "PUT", body: JSON.stringify({ whatsapp: { apiUrl: whatsappApiUrl, apiKey: whatsappApiKey || undefined, instance: whatsappInstance, adminPhone: whatsappAdminPhone || undefined, enabled: whatsappEnabled } }) });
      applyConfig(data.configuracao);
      setWhatsappApiKey("");
      setWhatsappMessage({ type: "success", text: "Configuração do WhatsApp salva com segurança. Consulte o status para validar." });
    } catch (error) {
      setWhatsappMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao salvar o WhatsApp." });
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function testWhatsapp() {
    setWhatsappMessage(null);
    setTestingWhatsapp(true);
    try {
      const data = await api<{ ok: boolean; estado?: string; erro?: string }>("/api/admin/configuracoes/notificacoes/testar-whatsapp", { method: "POST" });
      setWhatsappMessage(data.ok ? { type: "success", text: `Evolution API conectada. Status da instância: ${data.estado ?? "desconhecido"}.` } : { type: "error", text: data.erro ?? "Não foi possível validar o WhatsApp." });
      if (data.ok) await load();
    } catch (error) {
      setWhatsappMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao testar o WhatsApp." });
    } finally {
      setTestingWhatsapp(false);
    }
  }

  async function sendWhatsappTest() {
    setWhatsappMessage(null);
    setSendingWhatsapp(true);
    try {
      const data = await api<{ ok: boolean; erro?: string }>("/api/admin/configuracoes/notificacoes/testar-whatsapp-mensagem", { method: "POST", body: JSON.stringify({ number: testNumber }) });
      setWhatsappMessage(data.ok ? { type: "success", text: "Mensagem de teste aceita pela Evolution API." } : { type: "error", text: data.erro ?? "A Evolution API não aceitou o envio." });
    } catch (error) {
      setWhatsappMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao enviar o teste." });
    } finally {
      setSendingWhatsapp(false);
    }
  }

  async function clearWhatsapp() {
    if (!window.confirm("Remover toda a configuração do WhatsApp? As notificações ficarão indisponíveis até um novo cadastro.")) return;
    setClearingWhatsapp(true);
    setWhatsappMessage(null);
    try {
      const data = await api<{ configuracao: NotificationDisplay }>("/api/admin/configuracoes/notificacoes/limpar-whatsapp", { method: "POST" });
      applyConfig(data.configuracao);
      setWhatsappApiKey("");
      setWhatsappMessage({ type: "success", text: "Configuração do WhatsApp removida." });
    } catch (error) {
      setWhatsappMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao remover o WhatsApp." });
    } finally {
      setClearingWhatsapp(false);
    }
  }

  const secretType = showSecrets ? "text" : "password";
  const smtpStatus = config?.smtp.validado && config.smtp.preenchido ? { className: "bg-[#eaf8f0] text-[#157a54]", text: "Configurado e validado" } : config?.smtp.preenchido ? { className: "bg-[#fff6df] text-[#9a6a00]", text: "Preenchido, ainda não testado" } : { className: "bg-[#f8f4ee] text-[#887d73]", text: "Ainda não configurado" };
  const whatsappStatus = config?.whatsapp.validado && config.whatsapp.preenchido ? { className: "bg-[#eaf8f0] text-[#157a54]", text: config.whatsapp.prontoParaNotificar ? "Pronto para notificar" : "Conectado; informe o WhatsApp do admin" } : config?.whatsapp.preenchido ? { className: "bg-[#fff6df] text-[#9a6a00]", text: "Preenchido, ainda não testado" } : { className: "bg-[#f8f4ee] text-[#887d73]", text: "Ainda não configurado" };

  return <section className="bg-[#f8f4ee] px-4 pb-12 md:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-end justify-between gap-4 border-t border-[#e9e1d8] pt-8"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Notificações</p><h2 className="mt-2 text-3xl font-black tracking-[-0.07em] text-[#16120f]">SMTP e WhatsApp</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e655d]">Configure os canais usados para avisos transacionais e comunicação interna da operação.</p></div><ShieldCheck className="hidden text-[#f26822] sm:block" size={30} /></div><div className="mt-6 flex justify-end"><button type="button" onClick={() => setShowSecrets((value) => !value)} className="inline-flex items-center gap-2 text-xs font-black text-[#f26822]">{showSecrets ? <EyeOff size={15} /> : <Eye size={15} />}{showSecrets ? "Ocultar texto digitado" : "Exibir texto digitado"}</button></div><section className="mt-3 rounded-3xl border border-[#e9e1d8] bg-white p-6 shadow-[0_18px_50px_rgba(68,44,25,0.06)] md:p-8"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Mail className="text-[#f26822]" size={20} /><h3 className="text-xl font-black">E-mail via SMTP</h3></div><p className="mt-2 text-sm leading-6 text-[#887d73]">Use o SMTP do provedor de e-mail da empresa. O teste valida conexão e autenticação, sem enviar mensagem.</p></div>{loading ? <LoaderCircle className="animate-spin text-[#f26822]" size={20} /> : <span className={`rounded-full px-3 py-1 text-xs font-black ${smtpStatus.className}`}>{smtpStatus.text}</span>}</div>{smtpMessage && <MessageBox message={smtpMessage} />}<form onSubmit={saveSmtp} className="mt-6 grid gap-4 sm:grid-cols-2"><Field id="smtpHost" label="Host SMTP" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.exemplo.com" /><Field id="smtpPort" label="Porta" value={smtpPort} onChange={setSmtpPort} placeholder="465" inputMode="numeric" /><Field id="smtpUser" label="Usuário" value={smtpUser} onChange={setSmtpUser} placeholder="usuario@dominio.com" autoComplete="username" /><Field id="smtpPassword" label="Senha" value={smtpPassword} onChange={setSmtpPassword} type={secretType} placeholder={config?.smtp.password ? "••••••••" : "Senha SMTP"} autoComplete="new-password" /><Field id="smtpFrom" label="Remetente" value={smtpFrom} onChange={setSmtpFrom} placeholder="ATW Group <no-reply@dominio.com>" className="sm:col-span-2" /><label className="flex items-center gap-3 text-sm font-bold text-[#514840] sm:col-span-2"><input type="checkbox" checked={smtpSecure} onChange={(event) => setSmtpSecure(event.target.checked)} className="h-4 w-4 accent-[#f26822]" /> Usar TLS/SSL seguro (porta 465)</label><div className="flex flex-wrap gap-3 sm:col-span-2"><button type="submit" disabled={savingSmtp || testingSmtp} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f26822] px-5 text-sm font-black text-white hover:bg-[#d94f0f] disabled:opacity-50"><Check size={16} />{savingSmtp ? "Salvando..." : "Salvar SMTP"}</button><button type="button" onClick={() => void testSmtp()} disabled={savingSmtp || testingSmtp || clearingSmtp} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ded6cd] px-5 text-sm font-black text-[#4d443d] hover:border-[#f26822] disabled:opacity-50">{testingSmtp ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}{testingSmtp ? "Testando..." : "Testar conexão"}</button>{config?.smtp.preenchido && <button type="button" onClick={() => void clearSmtp()} disabled={savingSmtp || testingSmtp || clearingSmtp} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#f4c9b1] px-5 text-sm font-black text-[#a53a10] hover:bg-[#fff0e6] disabled:opacity-50"><Trash2 size={16} />{clearingSmtp ? "Removendo..." : "Remover SMTP"}</button>}</div></form><p className="mt-5 rounded-2xl bg-[#fff8f2] p-4 text-xs leading-5 text-[#6e655d]">A senha é armazenada cifrada no banco, nunca retorna em texto puro e não é gravada no log de auditoria. Deixe o campo de senha vazio para manter a atual.</p></section><section className="mt-6 rounded-3xl border border-[#e9e1d8] bg-white p-6 shadow-[0_18px_50px_rgba(68,44,25,0.06)] md:p-8"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><MessageCircle className="text-[#157a54]" size={20} /><h3 className="text-xl font-black">WhatsApp (Evolution API)</h3></div><p className="mt-2 text-sm leading-6 text-[#887d73]">Conecte a instância usada para notificações e defina o WhatsApp que recebe os avisos internos da operação.</p></div>{loading ? <LoaderCircle className="animate-spin text-[#f26822]" size={20} /> : <span className={`rounded-full px-3 py-1 text-xs font-black ${whatsappStatus.className}`}>{whatsappStatus.text}</span>}</div>{whatsappMessage && <MessageBox message={whatsappMessage} />}<form onSubmit={saveWhatsapp} className="mt-6 grid gap-4"><Field id="whatsappApiUrl" label="URL da Evolution API" value={whatsappApiUrl} onChange={setWhatsappApiUrl} placeholder="https://evolution.exemplo.com" /><Field id="whatsappApiKey" label="Chave da API" value={whatsappApiKey} onChange={setWhatsappApiKey} type={secretType} placeholder={config?.whatsapp.apiKey ? "••••••••" : "Chave da API"} autoComplete="new-password" /><Field id="whatsappInstance" label="Nome da instância" value={whatsappInstance} onChange={setWhatsappInstance} placeholder="atwgroup" /><Field id="whatsappAdminPhone" label="WhatsApp do administrador" value={whatsappAdminPhone} onChange={setWhatsappAdminPhone} placeholder="(11) 91234-5678" inputMode="tel" /><label className="flex items-center gap-3 text-sm font-bold text-[#514840]"><input type="checkbox" checked={whatsappEnabled} onChange={(event) => setWhatsappEnabled(event.target.checked)} className="h-4 w-4 accent-[#f26822]" /> Ativar notificações de WhatsApp</label><div className="flex flex-wrap gap-3"><button type="submit" disabled={savingWhatsapp || testingWhatsapp || sendingWhatsapp} className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f26822] px-5 text-sm font-black text-white hover:bg-[#d94f0f] disabled:opacity-50"><Check size={16} />{savingWhatsapp ? "Salvando..." : "Salvar WhatsApp"}</button><button type="button" onClick={() => void testWhatsapp()} disabled={savingWhatsapp || testingWhatsapp || clearingWhatsapp} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#ded6cd] px-5 text-sm font-black text-[#4d443d] hover:border-[#f26822] disabled:opacity-50">{testingWhatsapp ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}{testingWhatsapp ? "Consultando..." : "Atualizar status"}</button>{config?.whatsapp.preenchido && <button type="button" onClick={() => void clearWhatsapp()} disabled={savingWhatsapp || testingWhatsapp || clearingWhatsapp} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#f4c9b1] px-5 text-sm font-black text-[#a53a10] hover:bg-[#fff0e6] disabled:opacity-50"><Trash2 size={16} />{clearingWhatsapp ? "Removendo..." : "Remover WhatsApp"}</button>}</div></form><div className="mt-7 border-t border-[#eee8df] pt-6"><h4 className="text-base font-black">Enviar mensagem de teste</h4><p className="mt-2 text-sm leading-6 text-[#887d73]">Informe um número com DDD. Ele não é salvo; a mensagem só é enviada ao clicar no botão.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input aria-label="WhatsApp de teste" type="tel" value={testNumber} onChange={(event) => setTestNumber(event.target.value)} placeholder="(11) 91234-5678" autoComplete="off" className="h-11 min-w-0 flex-1 rounded-xl border border-[#ded6cd] px-4 text-sm outline-none focus:border-[#f26822]" /><button type="button" onClick={() => void sendWhatsappTest()} disabled={sendingWhatsapp || !testNumber} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#ded6cd] px-5 text-sm font-black text-[#4d443d] hover:border-[#f26822] disabled:opacity-50">{sendingWhatsapp ? <LoaderCircle className="animate-spin" size={16} /> : <MessageCircle size={16} />}{sendingWhatsapp ? "Enviando..." : "Enviar teste"}</button></div></div><p className="mt-5 rounded-2xl bg-[#fff8f2] p-4 text-xs leading-5 text-[#6e655d]">A chave da Evolution API é cifrada. O número do administrador é usado como destino dos avisos internos e pode ser alterado sem expor a chave.</p></section></div></section>;
}

function MessageBox({ message }: Readonly<{ message: Message }>) {
  if (!message) return null;
  return <div role={message.type === "error" ? "alert" : "status"} className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold ${message.type === "error" ? "border-[#f4c9b1] bg-[#fff0e6] text-[#a53a10]" : "border-[#bde4cf] bg-[#eaf8f0] text-[#157a54]"}`}><Check size={18} />{message.text}</div>;
}

function Field({ id, label, value, onChange, placeholder, type = "text", autoComplete = "off", inputMode, className = "" }: Readonly<{ id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: "text" | "password"; autoComplete?: string; inputMode?: "numeric" | "tel"; className?: string }>) {
  return <label htmlFor={id} className={`grid gap-2 text-xs font-black text-[#514840] ${className}`}><span>{label}</span><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} maxLength={512} className="h-12 rounded-xl border border-[#ded6cd] bg-white px-4 text-sm font-normal text-[#302a25] outline-none focus:border-[#f26822] focus:ring-4 focus:ring-[#f26822]/10" /></label>;
}
