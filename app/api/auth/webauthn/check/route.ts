import { NextResponse } from "next/server";
import { getCredentials } from "@/lib/webauthn";

const USER_ID = process.env.ADMIN_EMAIL || "admin";

// Check if biometric login is available for this user
export async function GET() {
  try {
    const creds = await getCredentials(USER_ID);
    return NextResponse.json({ available: creds.length > 0, count: creds.length });
  } catch {
    return NextResponse.json({ available: false, count: 0 });
  }
}
