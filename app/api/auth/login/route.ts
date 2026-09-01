import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/auth.service";
import { setSessionCookie } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    const user = await loginUser(await request.json());
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    return setSessionCookie(response, user);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") return NextResponse.json({ error: "Autenticação indisponível até o banco e o segredo da sessão serem configurados." }, { status: 503 });
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }
}
