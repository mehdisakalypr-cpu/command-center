import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const PUBLIC = [
  "/login",
  "/api/auth",
  "/api/telegram-webhook",
  "/_next",
  "/favicon.ico",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets
  if (pathname.includes(".") || pathname.startsWith("/_next")) return NextResponse.next();

  // Public routes
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Verify JWT session
  try {
    const token = req.cookies.get("cc_session")?.value;
    if (!token) throw new Error("no token");
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch {
    // API routes → 401 JSON, pages → redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
