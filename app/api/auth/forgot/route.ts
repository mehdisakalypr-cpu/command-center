import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { Resend } from "resend";

const SECRET = process.env.JWT_SECRET ?? "cc-forgot-fallback";

// In-memory OTP store (simple for single-admin)
const otpStore = new Map<string, { code: string; expires: number }>();

export async function POST(req: NextRequest) {
  const { email, action, code, newPassword } = await req.json();

  // Step 1: Send OTP
  if (action === "send") {
    if (!email || email !== process.env.ADMIN_EMAIL) {
      // Don't reveal if email exists — always return success
      return NextResponse.json({ ok: true });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, { code: otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 min

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Command Center <onboarding@resend.dev>",
        to: email,
        subject: "Command Center — Code de récupération",
        html: `
          <div style="font-family:monospace;max-width:400px;margin:0 auto;padding:32px;background:#0a0a0a;color:#e0e0e0;border-radius:8px;border:1px solid #333;">
            <h2 style="color:#1a6fff;margin:0 0 16px;">COMMAND CENTER</h2>
            <p style="color:#999;font-size:13px;">Code de récupération :</p>
            <div style="text-align:center;margin:24px 0;">
              <span style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#1a6fff;">${otp}</span>
            </div>
            <p style="color:#666;font-size:11px;">Ce code expire dans 10 minutes.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Forgot email error:", e);
    }

    return NextResponse.json({ ok: true });
  }

  // Step 2: Verify OTP and reset password
  if (action === "reset") {
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Minimum 8 caractères" }, { status: 400 });
    }

    const stored = otpStore.get(email);
    if (!stored || stored.code !== code || Date.now() > stored.expires) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 401 });
    }

    // Generate new bcrypt hash
    const bcrypt = await import("bcryptjs");
    const newHash = await bcrypt.hash(newPassword, 10);

    // Clear OTP
    otpStore.delete(email);

    // Return the new hash — admin must update ADMIN_PASSWORD_HASH env var
    // For now, we'll also store it temporarily so the login works immediately
    // by setting it in process.env (works for current process only)
    process.env.ADMIN_PASSWORD_HASH = newHash;

    return NextResponse.json({ ok: true, hash: newHash });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
