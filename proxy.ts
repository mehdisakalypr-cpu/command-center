import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const PUBLIC = ["/login", "/api/auth", "/api/telegram-webhook", "/_next", "/favicon.ico"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  try {
    const token = req.cookies.get("cc_session")?.value;
    if (!token) throw new Error("no token");
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const proxyConfig = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
