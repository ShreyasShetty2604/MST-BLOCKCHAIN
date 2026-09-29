// Device fingerprint via WebAuthn platform authenticators (Touch ID, Windows Hello, Android).
// The browser never exposes the fingerprint itself — we get a credential id per enrolment, and
// that id is what we map to a patient. Verification is client-side only (mock backend).
//
// SAFETY: Every navigator.credentials call is gated behind a capability check
// (isUserVerifyingPlatformAuthenticatorAvailable) to prevent Chrome's native
// "Scan QR Code / Use Security Key" fallback dialog on hardware-less devices.
// On hardware unavailability or any error, a SHA-256 custom passkey is used instead.

const APP_SALT = 'medivault-sovereign-health-id-v1';

export type ScanResult =
  | { status: 'found'; credentialId: string; credentialType: 'webauthn-fingerprint' | 'custom-passkey' }
  | { status: 'none' }
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

/**
 * Derives a deterministic SHA-256 custom passkey from a user identifier.
 * Same input → same credential on any device, no OS prompt, no Chrome dialog.
 */
async function deriveCustomPasskey(identifier: string): Promise<string> {
  const input = `${identifier}:${APP_SALT}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'CUSTOM-' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').slice(0, 32);
}

export async function scanDeviceFingerprint(mediId?: string): Promise<ScanResult> {
  // STEP 1: Capability check — never call navigator.credentials on hardware-less devices
  const hasPlatform = await isDeviceBiometricAvailable();

  if (hasPlatform) {
    try {
      // STEP 4: Runtime safety net — any error falls back to custom passkey
      const cred = (await navigator.credentials.get({
        publicKey: {
          challenge: randomBytes(32),
          userVerification: 'required',
          timeout: 60_000
        }
      })) as PublicKeyCredential | null;

      if (cred) {
        return {
          status: 'found',
          credentialId: toBase64Url(cred.rawId),
          credentialType: 'webauthn-fingerprint'
        };
      }
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')) {
        // User cancelled — fall through to custom passkey
      } else {
        // Any other error — fall through to custom passkey
        console.warn('[WebAuthn] scanDeviceFingerprint failed, falling back to custom passkey:', err);
      }
    }
  }

  // Hardware unavailable or failed → derive custom passkey (silent, no OS/browser dialog)
  if (mediId) {
    const credentialId = await deriveCustomPasskey(mediId);
    return { status: 'found', credentialId, credentialType: 'custom-passkey' };
  }

  return { status: 'none' };
}

// Enrols a new fingerprint-backed passkey for this site and returns its credential id.
export async function registerDeviceFingerprint(user: {
  name: string;
  displayName: string;
  mediId?: string;
}): Promise<string> {
  // STEP 1: Capability check
  const hasPlatform = await isDeviceBiometricAvailable();

  if (hasPlatform) {
    try {
      // STEP 4: Runtime safety net
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: randomBytes(32),
          rp: { name: 'MediVault' },
          user: { id: randomBytes(16), name: user.name, displayName: user.displayName },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required'
          },
          timeout: 60_000
        }
      })) as PublicKeyCredential | null;

      if (cred) {
        return toBase64Url(cred.rawId);
      }
    } catch (err) {
      console.warn('[WebAuthn] registerDeviceFingerprint failed, falling back to custom passkey:', err);
      // Falls through to custom passkey below
    }
  }

  // Hardware unavailable or failed → derive deterministic custom passkey from identifier
  const identifier = user.mediId || user.name;
  return deriveCustomPasskey(identifier);
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
}

function toBase64Url(buf: ArrayBuffer): string {
  let bin = '';
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
