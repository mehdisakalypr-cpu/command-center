import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PAGES = new Set(["/"]);
const PUBLIC_PAGE_PREFIXES = [
  "/auth/",      // login, register, forgot, reset-password, callback, biometric-setup
  "/login",      // legacy redirect page
];
const PUBLIC_API = new Set([
  "/api/auth/webauthn/authenticate",
  "/api/auth/webauthn/check",
]);
const PUBLIC_API_PREFIXES = [
  "/api/auth/callback",
];

function isStaticAsset(p: string) {
  return p.startsWith("/_next") || p.startsWith("/favicon") || p.includes(".");
}
function isPublicPage(p: string) {
  if (PUBLIC_PAGES.has(p)) return true;
  return PUBLIC_PAGE_PREFIXES.some(x => p.startsWith(x));
}
function isPublicApi(p: string) {
  if (PUBLIC_API.has(p)) return true;
  return PUBLIC_API_PREFIXES.some(x => p.startsWith(x));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();
  if (isPublicPage(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/") && isPublicApi(pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      response.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c));
      return res;
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    const redir = NextResponse.redirect(loginUrl);
    // Preserve any refreshed Supabase session cookies so the user doesn't
    // land on /auth/login with a half-refreshed session.
    response.cookies.getAll().forEach(c => redir.cookies.set(c.name, c.value, c));
    return redir;
  }

  return response;
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
