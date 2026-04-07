import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (
    email !== process.env.ADMIN_EMAIL ||
    !password ||
    !process.env.ADMIN_PASSWORD_HASH ||
    !(await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH))
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
