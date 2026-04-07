"use client";

export default function QRSetup({ qrDataUrl, secret }: { qrDataUrl: string; secret: string }) {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a", fontFamily: "monospace",
    }}>
      <div style={{
        background: "#111", border: "1px solid #333", borderRadius: 8,
        padding: "2rem", display: "flex", flexDirection: "column", gap: "1.2rem", alignItems: "center",
      }}>
        <h1 style={{ color: "#e0e0e0", fontSize: "1.1rem", margin: 0, letterSpacing: 2 }}>
          CONFIGURATION 2FA
        </h1>
        <p style={{ color: "#666", fontSize: "0.8rem", margin: 0, textAlign: "center", maxWidth: 260 }}>
          Scannez ce QR code avec Authy ou Google Authenticator.
          <br />Ensuite supprimez cette page de votre historique.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="QR Code 2FA" width={240} height={240} style={{ borderRadius: 4 }} />
        <p style={{ color: "#444", fontSize: "0.7rem", margin: 0, wordBreak: "break-all", maxWidth: 260, textAlign: "center" }}>
          Clé manuelle : <span style={{ color: "#888" }}>{secret}</span>
        </p>
        <a href="/login" style={{
          background: "#1a6fff", borderRadius: 4, color: "#fff",
          padding: "0.6rem 1.2rem", textDecoration: "none", fontSize: "0.85rem",
        }}>
          Se connecter →
        </a>
      </div>
    </main>
  );
}
