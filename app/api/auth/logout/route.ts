import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth/session";

export async function POST() {
  return clearSessionCookie(NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } }));
}
