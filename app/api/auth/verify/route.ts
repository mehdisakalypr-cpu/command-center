import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  const secret = process.env.TOTP_SECRET;

  if (!secret || !code || !verifySync({ token: code, secret }).valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  await createSession();
  return NextResponse.json({ ok: true });
}
