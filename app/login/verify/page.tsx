"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [biometricPrompt, setBiometricPrompt] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "registering" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // After TOTP verification, check if biometric is already set up
  const checkAndPromptBiometric = useCallback(async () => {
    // Check browser support (Chrome, Firefox, Edge mobile)
    if (!window.PublicKeyCredential) return router.push("/");
    try {
      const platformOk =
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
          ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          : false;
      if (!platformOk) return router.push("/");

      // Check if already registered
      const res = await fetch("/api/auth/webauthn/check");
      const data = await res.json();
      if (data.available) {
        // Already set up, go straight to app
        router.push("/");
      } else {
        // Offer to set up biometric
        setBiometricPrompt(true);
      }
    } catch {
      router.push("/");
    }
  }, [router]);

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
      setVerified(true);
      checkAndPromptBiometric();
    } else {
      setError("Code invalide. Réessayez.");
      setCode("");
    }
  }

  async function registerBiometric() {
    setBiometricStatus("registering");
    try {
      // 1. Get registration options
      const optRes = await fetch("/api/auth/webauthn/register");
      const options = await optRes.json();

      // 2. Create credential via browser API (fingerprint prompt)
      const { startRegistration } = await import("@simplewebauthn/browser");
      const regResponse = await startRegistration({ optionsJSON: options });

      // 3. Verify with server
      const verifyRes = await fetch("/api/auth/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: regResponse,
          deviceName: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop",
        }),
      });

      if (verifyRes.ok) {
        setBiometricStatus("done");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setBiometricStatus("error");
      }
    } catch {
      setBiometricStatus("error");
    }
  }

  // TOTP verification form
  if (!verified) {
    return (
      <main style={mainStyle}>
        <form onSubmit={handleSubmit} style={formStyle}>
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

  // Biometric registration prompt
  if (biometricPrompt) {
    return (
      <main style={mainStyle}>
        <div style={formStyle}>
          {biometricStatus === "idle" && (
            <>
              <div style={{ fontSize: "2rem", textAlign: "center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1a6fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4" />
                  <path d="M8 15c0-2.2 1.8-4 4-4" />
                  <path d="M12 3c4.97 0 9 4.03 9 9 0 1.4-.32 2.72-.88 3.9" />
                  <path d="M3 12c0-4.97 4.03-9 9-9" />
                  <path d="M6.34 17.66A8.96 8.96 0 0 1 3 12" />
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .71-.15 1.39-.42 2" />
                  <path d="M7 12c0-2.76 2.24-5 5-5" />
                </svg>
              </div>
              <h2 style={{ color: "#e0e0e0", fontSize: "1rem", margin: 0, textAlign: "center" }}>
                Activer la connexion biométrique ?
              </h2>
              <p style={{ color: "#888", fontSize: "0.75rem", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                La prochaine fois, connectez-vous avec votre empreinte digitale au lieu du mot de passe + code 2FA.
              </p>
              <button onClick={registerBiometric} style={{
                ...btnStyle,
                padding: "0.8rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}>
                Activer l'empreinte
              </button>
              <button onClick={() => router.push("/")} style={linkBtnStyle}>
                Non merci, plus tard
              </button>
            </>
          )}

          {biometricStatus === "registering" && (
            <>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", animation: "pulse 1.5s ease-in-out infinite" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1a6fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                    <path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4" />
                    <path d="M8 15c0-2.2 1.8-4 4-4" />
                    <path d="M12 3c4.97 0 9 4.03 9 9 0 1.4-.32 2.72-.88 3.9" />
                    <path d="M3 12c0-4.97 4.03-9 9-9" />
                  </svg>
                </div>
              </div>
              <p style={{ color: "#888", fontSize: "0.8rem", margin: 0, textAlign: "center" }}>
                Touchez le capteur d'empreinte...
              </p>
            </>
          )}

          {biometricStatus === "done" && (
            <>
              <div style={{ textAlign: "center", fontSize: "2.5rem" }}>
                <span style={{ color: "#10B981" }}>&#10003;</span>
              </div>
              <p style={{ color: "#10B981", fontSize: "0.85rem", margin: 0, textAlign: "center", fontWeight: 600 }}>
                Biométrie activée !
              </p>
              <p style={{ color: "#666", fontSize: "0.75rem", margin: 0, textAlign: "center" }}>
                Redirection...
              </p>
            </>
          )}

          {biometricStatus === "error" && (
            <>
              <p style={{ color: "#f66", fontSize: "0.8rem", margin: 0, textAlign: "center" }}>
                Erreur lors de l'enregistrement.
              </p>
              <button onClick={registerBiometric} style={btnStyle}>
                Réessayer
              </button>
              <button onClick={() => router.push("/")} style={linkBtnStyle}>
                Passer
              </button>
            </>
          )}
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }`}</style>
      </main>
    );
  }

  // Loading state while checking biometric availability
  return (
    <main style={mainStyle}>
      <div style={formStyle}>
        <p style={{ color: "#888", fontSize: "0.8rem", margin: 0, textAlign: "center" }}>
          Chargement...
        </p>
      </div>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#0a0a0a", fontFamily: "monospace",
};
const formStyle: React.CSSProperties = {
  background: "#111", border: "1px solid #333", borderRadius: 8,
  padding: "2rem", width: 320, display: "flex", flexDirection: "column", gap: "1rem",
};
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
