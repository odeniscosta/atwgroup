import { NextResponse } from "next/server";
import { registerUser } from "@/server/auth/auth.service";
import { setSessionCookie } from "@/server/auth/session";

export async function POST(request: Request) {
  try {
    const user = await registerUser(await request.json());
    const response = NextResponse.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } });
    return setSessionCookie(response, user);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") return NextResponse.json({ error: "Autenticação indisponível até o banco e o segredo da sessão serem configurados." }, { status: 503 });
    if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    return NextResponse.json({ error: "Revise os dados informados." }, { status: 400 });
  }
}
