import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import QRSetup from "./QRSetup";

export default async function Setup2FAPage() {
  const authed = await getSession();
  if (!authed) redirect("/login");

  const secret = process.env.TOTP_SECRET!;
  const email = process.env.ADMIN_EMAIL!;
  const otpauth = `otpauth://totp/CommandCenter:${encodeURIComponent(email)}?secret=${secret}&issuer=CommandCenter`;
  const qrDataUrl = await QRCode.toDataURL(otpauth, { width: 240, margin: 2 });

  return <QRSetup qrDataUrl={qrDataUrl} secret={secret} />;
}
