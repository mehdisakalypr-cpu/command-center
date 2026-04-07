import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const ALLOWED_ACTIONS: Record<string, string> = {
  "restart-ftg":        "pm2 restart feel-the-gap",
  "restart-cc":         "pm2 restart command-center",
  "keepalive-supabase": "bash /root/monitor/supabase-keepalive.sh",
  "health-check":       "bash /root/monitor/health-check.sh",
};

export async function POST(req: NextRequest) {
  const { action } = await req.json().catch(() => ({}));
  const cmd = ALLOWED_ACTIONS[action];
  if (!cmd) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 15_000 });
    return NextResponse.json({ ok: true, output: (stdout + stderr).trim().slice(0, 500) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
