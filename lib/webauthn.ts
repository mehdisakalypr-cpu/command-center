import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { createClient } from "@supabase/supabase-js";

// ── Config ──────────────────────────────────────────────────────────────────────

const RP_NAME = "Command Center";
const APP_ID = "command-center";

// Allowed domains for WebAuthn — credentials are per-domain
const ALLOWED_HOSTS = new Set([
  "command-center01.duckdns.org",
  "command-center-lemon-xi.vercel.app",
  "localhost",
]);

/** Derive RP_ID and origin from the request Host header */
export function getWebAuthnConfig(host?: string | null) {
  const h = (host || "").replace(/:\d+$/, ""); // strip port
  const rpId = ALLOWED_HOSTS.has(h) ? h : "command-center01.duckdns.org";
  const origin = h === "localhost" ? `http://${host}` : `https://${rpId}`;
  return { rpId, origin, rpName: RP_NAME };
}

// ── Supabase (service role for RLS bypass) ──────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Types ────────────────────────────────────────────────────────────────────────

interface StoredCredential {
  id: string;
  user_id: string;
  app: string;
  public_key: string; // base64url-encoded
  counter: number;
  device_name: string | null;
  transports: string[] | null;
}

// ── DB helpers ───────────────────────────────────────────────────────────────────

async function getCredentials(userId: string): Promise<StoredCredential[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("app", APP_ID);
  return (data ?? []) as StoredCredential[];
}

async function saveCredential(cred: Omit<StoredCredential, "app"> & { app?: string }) {
  const sb = getSupabase();
  const { error } = await sb.from("webauthn_credentials").insert({
    ...cred,
    app: APP_ID,
  });
  if (error) throw new Error(`Save credential failed: ${error.message}`);
}

async function updateCounter(credId: string, newCounter: number) {
  const sb = getSupabase();
  await sb
    .from("webauthn_credentials")
    .update({ counter: newCounter, last_used_at: new Date().toISOString() })
    .eq("id", credId)
    .eq("app", APP_ID);
}

// ── Challenge store (in-memory, short-lived) ─────────────────────────────────────

const challenges = new Map<string, { challenge: string; expires: number }>();

function storeChallenge(userId: string, challenge: string) {
  challenges.set(userId, { challenge, expires: Date.now() + 5 * 60 * 1000 });
}

function getAndDeleteChallenge(userId: string): string | null {
  const entry = challenges.get(userId);
  challenges.delete(userId);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.challenge;
}

// ── Registration ─────────────────────────────────────────────────────────────────

export async function startRegistration(userId: string, host?: string | null) {
  const { rpId, rpName } = getWebAuthnConfig(host);
  const existing = await getCredentials(userId);
  const excludeCredentials = existing.map((c) => ({
    id: c.id,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: userId,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
    excludeCredentials,
  });

  storeChallenge(userId, options.challenge);
  return options;
}

export async function finishRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName?: string,
  host?: string | null
) {
  const { rpId, origin } = getWebAuthnConfig(host);
  const expectedChallenge = getAndDeleteChallenge(userId);
  if (!expectedChallenge) throw new Error("Challenge expired or missing");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credential } = verification.registrationInfo;

  await saveCredential({
    id: credential.id,
    user_id: userId,
    public_key: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    device_name: deviceName ?? null,
    transports: credential.transports ?? null,
  });

  return { verified: true, credentialId: credential.id };
}

// ── Authentication ───────────────────────────────────────────────────────────────

export async function startAuthentication(userId: string, host?: string | null) {
  const { rpId } = getWebAuthnConfig(host);
  const credentials = await getCredentials(userId);
  if (credentials.length === 0) return null;

  const allowCredentials = credentials.map((c) => ({
    id: c.id,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials,
    userVerification: "required",
  });

  storeChallenge(userId, options.challenge);
  return options;
}

export async function finishAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  host?: string | null
) {
  const { rpId, origin } = getWebAuthnConfig(host);
  const expectedChallenge = getAndDeleteChallenge(userId);
  if (!expectedChallenge) throw new Error("Challenge expired or missing");

  const credentials = await getCredentials(userId);
  const credential = credentials.find((c) => c.id === response.id);
  if (!credential) throw new Error("Credential not found");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpId,
    credential: {
      id: credential.id,
      publicKey: Buffer.from(credential.public_key, "base64url"),
      counter: credential.counter,
      transports: (credential.transports ?? []) as AuthenticatorTransportFuture[],
    },
  });

  if (!verification.verified) throw new Error("Authentication verification failed");

  await updateCounter(credential.id, verification.authenticationInfo.newCounter);
  return { verified: true };
}

export { getCredentials };
