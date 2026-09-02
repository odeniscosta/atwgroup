import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PaymentSettingsPanel } from "@/components/backoffice/payment-settings";
import { getUserFromToken } from "@/server/auth/auth.service";
import { sessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminConfiguracoesPage() {
  const cookieStore = await cookies();
  let user;
  try {
    user = await getUserFromToken(cookieStore.get(sessionCookie)?.value);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") {
      return <main className="container-shell flex min-h-[60vh] items-center justify-center py-16"><div className="max-w-lg rounded-3xl border border-[#f4c9b1] bg-[#fff8f2] p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Configurações</p><h1 className="mt-3 text-3xl font-black">Autenticação não configurada</h1><p className="mt-3 text-sm leading-6 text-[#6e655d]">Configure o banco e o segredo da sessão no ambiente do servidor para acessar esta área.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-[#f26822] px-5 py-3 text-sm font-black text-white">Voltar para a loja</Link></div></main>;
    }
    throw error;
  }
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/admin");
  return <PaymentSettingsPanel />;
}
