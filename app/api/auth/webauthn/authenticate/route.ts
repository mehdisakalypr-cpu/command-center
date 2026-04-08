import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { startAuthentication, finishAuthentication } from "@/lib/webauthn";

const USER_ID = process.env.ADMIN_EMAIL || "admin";

// GET — start authentication (generate challenge)
export async function GET() {
  try {
    const options = await startAuthentication(USER_ID);
    if (!options) return NextResponse.json({ available: false });
    return NextResponse.json({ available: true, ...options });
  } catch (err: unknown) {
    return NextResponse.json({ available: false });
  }
}

// POST — finish authentication (verify + create session)
export async function POST(req: NextRequest) {
  const { response } = await req.json();
  try {
    const result = await finishAuthentication(USER_ID, response);
    if (result.verified) {
      await createSession();
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 401 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
