// Device fingerprint via WebAuthn platform authenticators (Touch ID, Windows Hello, Android).
// The browser never exposes the fingerprint itself — we get a credential id per enrolment, and
// that id is what we map to a patient. Verification is client-side only (mock backend).
//
// ⚠️  IMPORTANT — WebAuthn is DISABLED in all default flows.
//     Chrome will show a native QR-code / security-key dialog whenever
//     navigator.credentials.get() is called and no platform authenticator
//     is present — even in a try/catch.  To prevent that dialog from ever
//     appearing we guard every call with isDeviceBiometricAvailable() and
//     bail out early when the device cannot honour the request natively.
//     Hardware passkeys can be re-enabled via VITE_ENABLE_HARDWARE_PASSKEY=true.

const HARDWARE_PASSKEY_ENABLED =
  typeof import.meta !== 'undefined' &&
  (import.meta as any).env?.VITE_ENABLE_HARDWARE_PASSKEY === 'true';

export type ScanResult =
  | { status: 'found'; credentialId: string }
  | { status: 'none' } // no passkey for this site on this device, or the user cancelled
  | { status: 'unavailable' } // platform authenticator not present — use MediID/DNA instead
  | { status: 'error'; message: string };

export async function isDeviceBiometricAvailable(): Promise<boolean> {
  try {
    return (
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

export async function scanDeviceFingerprint(): Promise<ScanResult> {
  // Guard 1 — dev flag must be on
  if (!HARDWARE_PASSKEY_ENABLED) return { status: 'unavailable' };

  // Guard 2 — platform authenticator must actually exist on this device
  const available = await isDeviceBiometricAvailable();
  if (!available) return { status: 'unavailable' };

  try {
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        userVerification: 'required',
        timeout: 60_000
      }
    })) as PublicKeyCredential | null;
    return cred ? { status: 'found', credentialId: toBase64Url(cred.rawId) } : { status: 'none' };
  } catch (err) {
    if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
      return { status: 'none' };
    }
    return { status: 'error', message: err instanceof Error ? err.message : 'Biometric scan failed' };
  }
}

// Enrols a new fingerprint-backed passkey for this site and returns its credential id.
export async function registerDeviceFingerprint(user: { name: string; displayName: string }): Promise<string> {
  // Guard 1 — dev flag must be on
  if (!HARDWARE_PASSKEY_ENABLED) {
    throw new Error('Hardware passkey enrolment is disabled. Use virtual fingerprint instead.');
  }

  // Guard 2 — platform authenticator must actually exist on this device
  const available = await isDeviceBiometricAvailable();
  if (!available) {
    throw new Error('No platform authenticator available on this device. Use MediID or DNA code instead.');
  }

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'MediVault' },
      user: { id: randomBytes(16), name: user.name, displayName: user.displayName },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'required'
      },
      timeout: 60_000
    }
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Fingerprint enrolment was cancelled');
  return toBase64Url(cred.rawId);
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

function toBase64Url(buf: ArrayBuffer): string {
  let bin = '';
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
