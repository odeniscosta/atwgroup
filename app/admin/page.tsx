import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OperationsDashboard } from "@/components/backoffice/operations-dashboard";
import { getUserFromToken } from "@/server/auth/auth.service";
import { sessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  let user: Awaited<ReturnType<typeof getUserFromToken>> = null;
  let databaseUnavailable = false;
  try { user = await getUserFromToken(cookieStore.get(sessionCookie)?.value); }
  catch (error) { if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") databaseUnavailable = true; else throw error; }
  if (databaseUnavailable) return <main className="container-shell flex min-h-[60vh] items-center justify-center py-16"><div className="max-w-lg rounded-3xl border border-[#f4c9b1] bg-[#fff8f2] p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Painel administrativo</p><h1 className="mt-3 text-3xl font-black">Banco de dados não configurado</h1><p className="mt-3 text-sm leading-6 text-[#6e655d]">Configure DATABASE_URL e NEXTAUTH_SECRET no ambiente do servidor para habilitar a sessão administrativa.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-[#f26822] px-5 py-3 text-sm font-black text-white">Voltar para a loja</Link></div></main>;
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "MANAGER") redirect(user.role === "SELLER" ? "/vendedor" : "/minha-conta");
  return <OperationsDashboard role={user.role} />;
}
