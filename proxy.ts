import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "./lib/rate-limit";

// CC is a private admin tool — no public pages. Everything (including "/" which
// hosts the Aria voice interface) requires authentication.
const PUBLIC_PAGES = new Set<string>([]);
const PUBLIC_PAGE_PREFIXES = [
  "/auth/",      // login, register, forgot, reset-password, callback, biometric-setup
  "/login",      // legacy redirect page
  "/saas/",      // Hisoka Phase 5 — public landings /saas/[slug]
];
const PUBLIC_API = new Set([
  "/api/auth/login",                  // server-side login proxy (rate-limit + Turnstile)
  "/api/auth/register",               // signup (rate-limit + HIBP + Turnstile)
  "/api/auth/logout",                 // clear session
  "/api/auth/csrf",                   // CSRF token mint (no auth required)
  "/api/auth/forgot",                 // request reset OTP
  "/api/auth/reset",                  // consume reset OTP
  "/api/auth/magic-link/start",       // request magic link email
  "/api/auth/magic-link/verify",      // verify magic link token
  "/api/auth/mfa/verify",             // consume mfa_token during login
  "/api/auth/check-access",           // post-login site_access verify
  "/api/auth/check-email-access",     // pre-login biometric gate
  "/api/auth/webauthn/authenticate",
  "/api/auth/webauthn/check",
]);
const PUBLIC_API_PREFIXES = [
  "/api/auth/callback",
  "/api/saas/",       // Hisoka Phase 5 — waitlist POST from public landings
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

// Public root domain for SaaS landings. Subdomains `{slug}.gapup.io` are
// rewritten to `/saas/{slug}/...` transparently. Admin is blocked on this host.
const PUBLIC_ROOT_HOST = "gapup.io";

function hostSlug(host: string | null): string | null {
  if (!host) return null;
  const h = host.toLowerCase().split(":")[0];
  if (h === PUBLIC_ROOT_HOST || h === `www.${PUBLIC_ROOT_HOST}`) return "__root__";
  if (h.endsWith(`.${PUBLIC_ROOT_HOST}`)) {
    return h.slice(0, h.length - PUBLIC_ROOT_HOST.length - 1);
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  // Wildcard *.gapup.io — rewrite public SaaS landings and block admin paths.
  const slug = hostSlug(host);
  if (slug && slug !== "__root__") {
    // Block admin + internal APIs from leaking onto the public host.
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      return NextResponse.rewrite(new URL("/404", request.url));
    }
    // Don't double-rewrite if already targeting /saas/{slug}.
    if (!pathname.startsWith("/saas/") && !pathname.startsWith("/api/saas/") && !isStaticAsset(pathname)) {
      const url = request.nextUrl.clone();
      // /foo → /saas/{slug}/foo , / → /saas/{slug}
      url.pathname = pathname === "/" ? `/saas/${slug}` : `/saas/${slug}${pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  if (slug === "__root__") {
    // gapup.io root has no public homepage for now — portfolio lives inside
    // the Command Center at /admin/businesses (auth-gated). Block admin
    // paths from leaking on this host; everything else falls through to the
    // default auth flow (which redirects to /auth/login).
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      return NextResponse.rewrite(new URL("/404", request.url));
    }
  }

  if (isStaticAsset(pathname)) return NextResponse.next();
  if (isPublicPage(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/") && isPublicApi(pathname)) return NextResponse.next();

  // Cron-authed endpoints: laisser passer pour les jobs automatisés.
  // 3 formes acceptées :
  //  - x-cron-secret: <CRON_SECRET>           (VPS curl — legacy)
  //  - Authorization: Bearer <CRON_SECRET>    (Vercel cron native)
  //  - x-vercel-cron présent                  (trustable, signé par Vercel infra)
  if (process.env.CRON_SECRET) {
    const xCronSecret = request.headers.get("x-cron-secret");
    if (xCronSecret === process.env.CRON_SECRET) return NextResponse.next();
    const authz = request.headers.get("authorization");
    if (authz === `Bearer ${process.env.CRON_SECRET}`) return NextResponse.next();
  }
  if (request.headers.get("x-vercel-cron")) return NextResponse.next();

  // Global rate-limit for /api/* (sliding window, 100 req / 60s / IP).
  // Upstash-backed in prod, in-memory fallback dev. Skips static + public pages.
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const rl = await rateLimit({ key: `api:${ip}`, limit: 100, windowSec: 60 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        // Persist Supabase's refreshed session cookies onto BOTH request + response
        // without recreating the response (which drops cookies from previous iterations).
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
