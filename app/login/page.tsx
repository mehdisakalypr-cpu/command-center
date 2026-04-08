"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Check if biometric login is available (passkey registered + browser supports it)
  useEffect(() => {
    (async () => {
      // Check browser support — works on Chrome, Firefox, Edge mobile
      if (!window.PublicKeyCredential) return;
      try {
        // Check platform authenticator (fingerprint/face) availability
        const platformOk =
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
            ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
            : false;
        if (!platformOk) return;

        // Check if user has registered passkeys
        const res = await fetch("/api/auth/webauthn/check");
        const data = await res.json();
        if (data.available) setBiometricAvailable(true);
      } catch {
        // silently fail — no biometric
      }
    })();
  }, []);

  const handleBiometricLogin = useCallback(async () => {
    setBiometricLoading(true);
    setError("");
    try {
      // 1. Get authentication options from server
      const optRes = await fetch("/api/auth/webauthn/authenticate");
      const options = await optRes.json();
      if (!options.available) {
        setError("Biométrie non disponible.");
        setBiometricLoading(false);
        return;
      }

      // 2. Call WebAuthn browser API (triggers fingerprint prompt)
      // Using the raw Web API for max browser compatibility (Chrome/Firefox/Edge)
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const authResponse = await startAuthentication({ optionsJSON: options });

      // 3. Verify with server
      const verifyRes = await fetch("/api/auth/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authResponse }),
      });

      if (verifyRes.ok) {
        router.push("/");
      } else {
        setError("Authentification biométrique échouée.");
      }
    } catch (err: unknown) {
      // User cancelled or browser error
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("AbortError") || msg.includes("cancelled") || msg.includes("NotAllowedError")) {
        setError(""); // user cancelled, no error
      } else {
        setError("Erreur biométrique. Utilisez le mot de passe.");
      }
    }
    setBiometricLoading(false);
  }, [router]);

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
      <div style={{
        background: "#111", border: "1px solid #333", borderRadius: 8,
        padding: "2rem", width: 320, display: "flex", flexDirection: "column", gap: "1rem",
      }}>
        <h1 style={{ color: "#e0e0e0", fontSize: "1.1rem", margin: 0, letterSpacing: 2 }}>
          COMMAND CENTER
        </h1>
        <p style={{ color: "#666", fontSize: "0.75rem", margin: 0 }}>Accès restreint</p>

        {/* Biometric login button — shown when passkey is registered */}
        {biometricAvailable && !showPasswordForm && (
          <>
            <button
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              style={{
                ...btnStyle,
                background: "linear-gradient(135deg, #1a6fff, #0d4fcc)",
                padding: "1rem",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4" />
                <path d="M8 15c0-2.2 1.8-4 4-4" />
                <path d="M12 3c4.97 0 9 4.03 9 9 0 1.4-.32 2.72-.88 3.9" />
                <path d="M3 12c0-4.97 4.03-9 9-9" />
                <path d="M6.34 17.66A8.96 8.96 0 0 1 3 12" />
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .71-.15 1.39-.42 2" />
                <path d="M7 12c0-2.76 2.24-5 5-5" />
              </svg>
              {biometricLoading ? "Vérification..." : "Connexion biométrique"}
            </button>
            <button
              onClick={() => setShowPasswordForm(true)}
              style={{
                ...linkBtnStyle,
              }}
            >
              Utiliser le mot de passe
            </button>
          </>
        )}

        {/* Password form — shown when no passkey or user chooses password */}
        {(!biometricAvailable || showPasswordForm) && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus style={inputStyle}
            />
            <input
              type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
              required style={inputStyle}
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? "..." : "Continuer →"}
            </button>
            {biometricAvailable && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(false)}
                style={linkBtnStyle}
              >
                Utiliser la biométrie
              </button>
            )}
          </form>
        )}

        {error && <p style={{ color: "#f66", fontSize: "0.75rem", margin: 0 }}>{error}</p>}
      </div>
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
const linkBtnStyle: React.CSSProperties = {
  background: "none", border: "none", color: "#666",
  fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline",
  padding: "0.2rem",
};
