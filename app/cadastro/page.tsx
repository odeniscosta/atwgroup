"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email"), password: form.get("password") }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar a conta.");
      router.push("/minha-conta");
      router.refresh();
    } catch (registerError) { setError(registerError instanceof Error ? registerError.message : "Não foi possível criar a conta."); setLoading(false); }
  }

  return <MarketplaceShell><main className="container-shell py-10 md:py-16"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#8a8178] hover:text-[#f26822]"><ArrowLeft size={16} /> Voltar para a loja</Link><section className="mx-auto mt-8 max-w-md rounded-3xl border border-[#eee8df] bg-white p-6 shadow-[0_18px_50px_rgba(68,44,25,0.08)] md:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Comece agora</p><h1 className="mt-3 text-4xl font-black tracking-[-0.07em]">Criar conta</h1><p className="mt-3 text-sm leading-6 text-[#5f5852]">Salve seus dados e acompanhe suas compras na ATW.</p><form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-2 text-sm font-bold">Nome completo<input required minLength={2} name="name" autoComplete="name" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">E-mail<input required type="email" name="email" autoComplete="email" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /></label><label className="grid gap-2 text-sm font-bold">Senha<input required minLength={8} type="password" name="password" autoComplete="new-password" className="h-12 rounded-xl border border-[#ded6cd] px-4 font-normal outline-none focus:border-[#f26822]" /><small className="font-normal text-[#8a8178]">Use pelo menos 8 caracteres, com letras e números.</small></label>{error && <p role="alert" className="rounded-2xl bg-[#fff0e6] p-4 text-sm font-bold text-[#b43c0d]">{error}</p>}<button disabled={loading} className="flex h-13 items-center justify-center gap-2 rounded-full bg-[#f26822] px-5 py-3.5 text-sm font-black text-white hover:bg-[#d94f0f] disabled:opacity-60">{loading ? "Criando..." : "Criar minha conta"}</button></form><p className="mt-6 text-center text-sm text-[#5f5852]">Já tem conta? <Link href="/login" className="font-black text-[#f26822]">Entrar</Link></p><p className="mt-5 flex items-center justify-center gap-2 text-xs text-[#8a8178]"><LockKeyhole size={14} /> Seus dados ficam no servidor protegido.</p></section></main></MarketplaceShell>;
}
