import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "POST") {
    return NextResponse.rewrite(new URL("/api/checkout", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/orders",
};
