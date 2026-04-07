"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/login/verify");
    } else {
      setError("Email ou mot de passe invalide.");
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
          COMMAND CENTER
        </h1>
        <p style={{ color: "#666", fontSize: "0.75rem", margin: 0 }}>Accès restreint</p>
        <input
          type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          required autoFocus style={inputStyle}
        />
        <input
          type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
          required style={inputStyle}
        />
        {error && <p style={{ color: "#f66", fontSize: "0.75rem", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? "..." : "Continuer →"}
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
