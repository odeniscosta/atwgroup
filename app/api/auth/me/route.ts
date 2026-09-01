import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth/auth.service";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_NOT_CONFIGURED") return NextResponse.json({ user: null, configured: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
