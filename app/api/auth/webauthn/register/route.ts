import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { startRegistration, finishRegistration } from "@/lib/webauthn";

const USER_ID = process.env.ADMIN_EMAIL || "admin";

// GET — start registration (generate options)
export async function GET() {
  const authed = await getSession();
  if (!authed) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const options = await startRegistration(USER_ID);
  return NextResponse.json(options);
}

// POST — finish registration (verify response)
export async function POST(req: NextRequest) {
  const authed = await getSession();
  if (!authed) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { response, deviceName } = await req.json();
  try {
    const result = await finishRegistration(USER_ID, response, deviceName);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
