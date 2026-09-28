/**
 * MediVault Cryptographic Security Abstraction Layer
 *
 * Security Principles:
 * 1. AES-256-GCM authenticated encryption for sensitive biometric & DNA data off-chain.
 * 2. 96-bit (12-byte) unique random Initialization Vector (IV) for each encryption operation.
 * 3. 128-bit authentication tag verification ensures tamper resistance.
 * 4. SHA-256 cryptographic hashing for integrity checks and on-chain anchoring.
 * 5. Production Note: In production, master keys would be managed via AWS KMS,
 *    Google Cloud KMS, or a Hardware Security Module (HSM). For the hackathon,
 *    environment variables are utilized.
 */

export interface EncryptedPayload {
  ciphertext: string; // Hex-encoded encrypted data
  iv: string;         // Hex-encoded 12-byte initialization vector
  tag: string;        // Hex-encoded 16-byte authentication tag
  algorithm: 'AES-256-GCM';
  timestamp: string;
}

// Default development key (32 bytes = 256 bits) used only as fallback if .env is missing
const DEV_FALLBACK_KEY_HEX = 'a3f8c7e2b19d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789ab';

/**
 * Resolves the 256-bit AES master encryption key from environment or fallback.
 */
export function getMasterKeyHex(): string {
  if (typeof process !== 'undefined' && process.env?.ENCRYPTION_MASTER_KEY) {
    return process.env.ENCRYPTION_MASTER_KEY;
  }
  // @ts-ignore: Vite environment support
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENCRYPTION_MASTER_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_ENCRYPTION_MASTER_KEY;
  }
  return DEV_FALLBACK_KEY_HEX;
}

/**
 * Generates an internal opaque Patient Vault ID.
 * Format: VLT-XXXXXXXXXXXX (VLT- prefix + 12 uppercase hexadecimal characters)
 * Example: VLT-8F29A31B72C1
 */
export function generateVaultId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return `VLT-${hex.toUpperCase()}`;
}

/**
 * Helper to convert hex string to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Helper to convert Uint8Array / ArrayBuffer to hex string.
 */
function bytesToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Imports a 256-bit hexadecimal string as a Web Crypto CryptoKey for AES-GCM.
 */
async function importAesKey(keyHex: string): Promise<CryptoKey> {
  const rawKey = hexToBytes(keyHex);
  if (rawKey.length !== 32) {
    throw new Error(`Invalid AES key length: expected 32 bytes (256 bits), received ${rawKey.length} bytes`);
  }

  return await globalThis.crypto.subtle.importKey(
    'raw',
    rawKey as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary plaintext string using AES-256-GCM with a fresh random 96-bit IV.
 *
 * @param plaintext - UTF-8 string to encrypt (e.g. biometric template or DNA reference profile)
 * @param customKeyHex - Optional 32-byte hex key (defaults to environment master key)
 * @returns EncryptedPayload with separated ciphertext, IV, and auth tag
 */
export async function encryptData(plaintext: string, customKeyHex?: string): Promise<EncryptedPayload> {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }

  const keyHex = customKeyHex || getMasterKeyHex();
  const cryptoKey = await importAesKey(keyHex);

  // Generate 96-bit (12-byte) initialization vector
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);

  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  // Web Crypto AES-GCM appends the 16-byte authentication tag to the end of the ciphertext
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128 // 16 bytes auth tag
    },
    cryptoKey,
    encodedPlaintext as unknown as BufferSource
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  // Split ciphertext and 16-byte authentication tag
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    ciphertext: bytesToHex(ciphertextBytes),
    iv: bytesToHex(iv),
    tag: bytesToHex(tagBytes),
    algorithm: 'AES-256-GCM',
    timestamp: new Date().toISOString()
  };
}

/**
 * Decrypts an EncryptedPayload using AES-256-GCM and verifies authentication tag integrity.
 *
 * @param payload - EncryptedPayload object or serialized string
 * @param customKeyHex - Optional 32-byte hex key
 * @returns Decrypted plaintext string
 * @throws Error if ciphertext or tag was tampered with
 */
export async function decryptData(payload: EncryptedPayload | string, customKeyHex?: string): Promise<string> {
  let parsedPayload: EncryptedPayload;

  if (typeof payload === 'string') {
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      throw new Error('Invalid encrypted payload format: expected JSON string');
    }
  } else {
    parsedPayload = payload;
  }

  const { ciphertext, iv, tag } = parsedPayload;
  if (!ciphertext || !iv || !tag) {
    throw new Error('Encrypted payload missing ciphertext, iv, or tag');
  }

  const keyHex = customKeyHex || getMasterKeyHex();
  const cryptoKey = await importAesKey(keyHex);

  const ciphertextBytes = hexToBytes(ciphertext);
  const ivBytes = hexToBytes(iv);
  const tagBytes = hexToBytes(tag);

  // Recombine ciphertext and 16-byte tag for Web Crypto SubtleCrypto API
  const combinedBuffer = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combinedBuffer.set(ciphertextBytes, 0);
  combinedBuffer.set(tagBytes, ciphertextBytes.length);

  try {
    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as unknown as BufferSource,
        tagLength: 128
      },
      cryptoKey,
      combinedBuffer as unknown as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    throw new Error('Decryption failed: Authenticated tag mismatch or corrupted ciphertext. Data may have been tampered with.');
  }
}

/**
 * Canonicalizes data (sorts object keys) and computes standard SHA-256 hash.
 * Output is 0x-prefixed 64-character hexadecimal string suitable for blockchain anchoring.
 */
export async function hashData(data: string | object): Promise<string> {
  let inputString: string;

  if (typeof data === 'object' && data !== null) {
    // Canonical JSON stringification (deterministic keys)
    inputString = JSON.stringify(data, Object.keys(data).sort());
  } else {
    inputString = String(data);
  }

  const encoder = new TextEncoder();
  const encoded = encoder.encode(inputString);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  return `0x${bytesToHex(hashBuffer)}`;
}

/**
 * Verifies whether candidate data hashes to the expected cryptographic hash.
 */
export async function verifyHash(data: string | object, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return false;
  const computed = await hashData(data);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}
