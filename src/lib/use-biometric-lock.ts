import { useCallback, useEffect, useState } from "react";

// Stores per-user biometric credential metadata in localStorage.
// The actual private key never leaves the device's secure enclave (WebAuthn).
const KEY = (userId: string) => `fitflow:biometric:${userId}`;

interface StoredCred {
  credentialId: string; // base64url
  enabledAt: number;
}

function b64uToBuffer(b64u: string): ArrayBuffer {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/").padEnd(b64u.length + ((4 - (b64u.length % 4)) % 4), "=");
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return buf;
}

function bytesToB64u(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined"
    && !!window.PublicKeyCredential
    && !!navigator.credentials;
}

export function useBiometricLock(userId: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const supported = isBiometricSupported();

  useEffect(() => {
    if (!userId) return setEnabled(false);
    const raw = localStorage.getItem(KEY(userId));
    setEnabled(!!raw);
  }, [userId]);

  const getStored = useCallback((): StoredCred | null => {
    if (!userId) return null;
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return null;
    try { return JSON.parse(raw) as StoredCred; } catch { return null; }
  }, [userId]);

  const enable = useCallback(async (userEmail?: string) => {
    if (!userId || !supported) throw new Error("Biometria não suportada neste dispositivo");
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FitFlow", id: window.location.hostname },
        user: {
          id: userIdBytes,
          name: userEmail || "user",
          displayName: userEmail || "FitFlow user",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Face ID / Touch ID / Windows Hello
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    }) as PublicKeyCredential | null;

    if (!cred) throw new Error("Falha ao registrar biometria");
    const stored: StoredCred = {
      credentialId: bytesToB64u(cred.rawId),
      enabledAt: Date.now(),
    };
    localStorage.setItem(KEY(userId), JSON.stringify(stored));
    setEnabled(true);
  }, [userId, supported]);

  const disable = useCallback(() => {
    if (!userId) return;
    localStorage.removeItem(KEY(userId));
    setEnabled(false);
  }, [userId]);

  const verify = useCallback(async (): Promise<boolean> => {
    if (!userId || !supported) return false;
    const stored = getStored();
    if (!stored) return false;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: b64uToBuffer(stored.credentialId),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
          timeout: 60000,
          rpId: window.location.hostname,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  }, [userId, supported, getStored]);

  return { supported, enabled, enable, disable, verify };
}
