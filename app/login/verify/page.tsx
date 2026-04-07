"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
    } else {
      setError("Code invalide. Réessayez.");
      setCode("");
    }
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a0a0a", fontFamily: "monospace",
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "#111", border: "1px solid #333", borderRadius: 8,
        padding: "2rem", width: 320, display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        <h1 style={{ color: "#e0e0e0", fontSize: "1.1rem", margin: 0, letterSpacing: 2 }}>
          VÉRIFICATION 2FA
        </h1>
        <p style={{ color: "#666", fontSize: "0.75rem", margin: 0 }}>
          Code à 6 chiffres — Authy / Google Authenticator
        </p>
        <input
          ref={inputRef}
          type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
          placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          required style={{ ...inputStyle, fontSize: "1.4rem", letterSpacing: 6, textAlign: "center" }}
        />
        {error && <p style={{ color: "#f66", fontSize: "0.75rem", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading || code.length !== 6} style={btnStyle}>
          {loading ? "..." : "Accéder →"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a", border: "1px solid #333", borderRadius: 4,
  color: "#e0e0e0", padding: "0.6rem 0.8rem", fontSize: "0.9rem", outline: "none",
};
const btnStyle: React.CSSProperties = {
  background: "#1a6fff", border: "none", borderRadius: 4,
  color: "#fff", padding: "0.7rem", fontSize: "0.9rem", cursor: "pointer",
};
