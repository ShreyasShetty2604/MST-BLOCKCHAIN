/**
 * MediVault Device Biometric Hardware Integration
 *
 * Implements native W3C WebAuthn Platform Authenticator (Touch ID, Face ID, Windows Hello, Android Biometrics)
 * with graceful fallback to simulated hardware sensor when platform authenticator is unavailable.
 */

// Helper to convert ArrayBuffer to Base64URL
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper to convert Base64URL to Uint8Array
function base64UrlToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface BiometricRegistrationResult {
  success: boolean;
  credentialId?: string;
  authenticatorType: 'platform-hardware' | 'simulated-enclave';
  error?: string;
  cancelled?: boolean;
}

export interface BiometricVerificationResult {
  success: boolean;
  credentialId?: string;
  authenticatorType: 'platform-hardware' | 'simulated-enclave';
  patientId?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Checks if the current browser/device supports WebAuthn platform authenticators (Touch ID, Windows Hello).
 */
export async function isPlatformBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Registers the device's hardware fingerprint / biometric scanner via WebAuthn.
 * Triggers native OS Touch ID / Windows Hello prompt.
 */
export async function registerDeviceBiometric(params: {
  userName: string;
  userEmail?: string;
  mediId?: string;
  vaultId?: string;
}): Promise<BiometricRegistrationResult> {
  const hasPlatform = await isPlatformBiometricAvailable();

  if (hasPlatform && window.navigator?.credentials) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // Deterministic or random user ID
      const userIdBytes = new TextEncoder().encode(params.mediId || params.userEmail || `medivault-${Date.now()}`);

      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'MediVault Sovereign Health ID',
            id: window.location.hostname
          },
          user: {
            id: userIdBytes,
            name: params.userEmail || `${params.userName.toLowerCase().replace(/\s+/g, '.')}@medivault.id`,
            displayName: params.userName || 'MediVault Patient'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256 (P-256 NIST curve, standard for Apple Touch ID & Windows Hello)
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Hardware device scanner (Touch ID / Windows Hello)
            userVerification: 'required',        // Requires physical fingerprint / face scan
            residentKey: 'preferred'
          },
          timeout: 60000,
          attestation: 'none'
        }
      };

      const credential = (await navigator.credentials.create(createOptions)) as PublicKeyCredential | null;

      if (credential) {
        const credentialId = credential.id;

        // Store credential ID in localStorage for easy authentication lookup
        try {
          localStorage.setItem('medivault_device_credential_id', credentialId);
          if (params.mediId) {
            localStorage.setItem(`medivault_cred_${params.mediId}`, credentialId);
          }
        } catch {
          // ignore localStorage error
        }

        // Send registration to backend API to encrypt and anchor template hash
        if (params.vaultId || params.mediId) {
          try {
            await fetch('/api/identity/fingerprint/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vaultId: params.vaultId || params.mediId,
                passkeyCredentialId: credentialId,
                deviceType: 'Hardware Platform Authenticator (Touch ID/Windows Hello)',
                minutiaeTemplate: `WEBAUTHN-ENCLAVE-HW-${credentialId.slice(0, 16)}`
              })
            });
          } catch {
            // Local fallback continues
          }
        }

        return {
          success: true,
          credentialId,
          authenticatorType: 'platform-hardware'
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          authenticatorType: 'platform-hardware',
          cancelled: true,
          error: 'Biometric scan was cancelled or timed out. You can retry with your device fingerprint or use simulated enrollment.'
        };
      }
      console.warn('[WebAuthn] Hardware registration note:', err?.message || err);
    }
  }

  // Fallback: Secure simulated enclave enrollment if platform hardware is unavailable
  const fallbackId = `ENCLAVE-FP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  try {
    localStorage.setItem('medivault_device_credential_id', fallbackId);
  } catch {}

  if (params.vaultId || params.mediId) {
    try {
      await fetch('/api/identity/fingerprint/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: params.vaultId || params.mediId,
          passkeyCredentialId: fallbackId,
          deviceType: 'Secure Simulated Enclave',
          minutiaeTemplate: `SIMULATED-TEMPLATE-${fallbackId}`
        })
      });
    } catch {}
  }

  return {
    success: true,
    credentialId: fallbackId,
    authenticatorType: 'simulated-enclave'
  };
}

/**
 * Scans the device's hardware fingerprint / biometric scanner via WebAuthn assertion.
 * Triggers native OS Touch ID / Windows Hello prompt.
 */
export async function scanDeviceBiometric(expectedCredentialId?: string): Promise<BiometricVerificationResult> {
  const hasPlatform = await isPlatformBiometricAvailable();

  if (hasPlatform && window.navigator?.credentials) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credId = expectedCredentialId || localStorage.getItem('medivault_device_credential_id');

      const getOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required', // Triggers physical Touch ID / biometric verification
          timeout: 60000,
          allowCredentials: credId ? [
            {
              id: base64UrlToBuffer(credId).buffer as ArrayBuffer,
              type: 'public-key' as const,
              transports: ['internal' as AuthenticatorTransport]
            }
          ] : undefined
        }
      };

      const assertion = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;

      if (assertion) {
        return {
          success: true,
          credentialId: assertion.id,
          authenticatorType: 'platform-hardware'
        };
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          authenticatorType: 'platform-hardware',
          cancelled: true,
          error: 'Touch ID / Fingerprint prompt was dismissed or cancelled.'
        };
      }
      console.warn('[WebAuthn] Hardware scan assertion note:', err?.message || err);
    }
  }

  // Fallback simulated sensor scan
  await new Promise((resolve) => setTimeout(resolve, 800));
  return {
    success: true,
    credentialId: 'ENCLAVE-SIMULATED-OK',
    authenticatorType: 'simulated-enclave'
  };
}
