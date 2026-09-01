import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, LogOut, PackageSearch, Store, UserRound } from "lucide-react";
import { getUserFromToken } from "@/server/auth/auth.service";
import { sessionCookie } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies();
  let user = null;
  try { user = await getUserFromToken(cookieStore.get(sessionCookie)?.value); }
  catch (error) { if (!(error instanceof Error) || error.message !== "AUTH_NOT_CONFIGURED") throw error; }
  if (!user) redirect("/login");
  const backoffice = user.role === "ADMIN" || user.role === "MANAGER" ? "/admin" : user.role === "SELLER" ? "/vendedor" : null;
  return <main className="container-shell min-h-[65vh] py-10 md:py-16"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#f26822]">Minha conta</p><h1 className="mt-3 text-4xl font-black tracking-[-0.07em] md:text-6xl">Olá, {user.name.split(" ")[0]}.</h1><p className="mt-4 text-sm text-[#5f5852]">{user.email}</p><div className="mt-9 grid gap-4 sm:grid-cols-2">{backoffice && <Link href={backoffice} className="group rounded-3xl border border-[#f7c5a8] bg-[#fff8f2] p-6 transition hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(68,44,25,0.1)]"><Store className="text-[#f26822]" /><h2 className="mt-5 text-xl font-black">{user.role === "SELLER" ? "Área do vendedor" : "Painel administrativo"}</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Gerencie produtos, estoque e pedidos.</p><span className="mt-5 flex items-center gap-2 text-xs font-black text-[#f26822]">Abrir painel <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>}<Link href="/acompanhar-pedido" className="group rounded-3xl border border-[#eee8df] bg-white p-6 transition hover:-translate-y-1 hover:border-[#f7c5a8] hover:shadow-[0_16px_38px_rgba(68,44,25,0.1)]"><PackageSearch className="text-[#f26822]" /><h2 className="mt-5 text-xl font-black">Acompanhar pedidos</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Consulte status e eventos de suas compras.</p><span className="mt-5 flex items-center gap-2 text-xs font-black text-[#f26822]">Consultar <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link><div className="rounded-3xl border border-[#eee8df] bg-white p-6"><UserRound className="text-[#f26822]" /><h2 className="mt-5 text-xl font-black">Dados da conta</h2><p className="mt-2 text-sm leading-6 text-[#5f5852]">Perfil {user.role.toLocaleLowerCase("pt-BR")} da ATW Group.</p><form action="/api/auth/logout" method="post" className="mt-5"><button className="flex items-center gap-2 text-xs font-black text-[#b43c0d]"><LogOut size={15} /> Sair da conta</button></form></div></div></main>;
}
