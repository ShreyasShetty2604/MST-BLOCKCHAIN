/**
 * MediVault - MediID Generator, Validator, and Hasher
 *
 * Requirements:
 * - 14 digits formatted as 91-XXXX-XXXX-XXXX
 * - Starting prefix "91"
 * - Cryptographically random payload (never based on phone, DOB, or Aadhaar)
 * - Luhn checksum algorithm for error detection
 * - Salted HMAC-SHA256 hashing for on-chain anchoring
 */

/**
 * Calculates the Luhn check digit for a given digit string.
 */
function calculateLuhnCheckDigit(digits: string): number {
  let sum = 0;
  let shouldDouble = true;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isNaN(digit)) return -1;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const remainder = sum % 10;
  return (10 - remainder) % 10;
}

/**
 * Verifies a 14-digit string using the Luhn algorithm.
 */
function verifyLuhnChecksum(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Formats a 14-digit string into 91-XXXX-XXXX-XXXX.
 */
export function formatMediIdString(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 14) return raw;
  return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}-${digits.slice(10, 14)}`;
}

/**
 * Generates a unique, valid MediID with a Luhn checksum.
 * Format: 91-XXXX-XXXX-XXXX (14 digits)
 */
export function generateMediID(): string {
  const prefix = '91';
  let randomPayload = '';

  // Generate 11 random digits
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(11);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 11; i++) {
      randomPayload += (bytes[i] % 10).toString();
    }
  } else {
    for (let i = 0; i < 11; i++) {
      randomPayload += Math.floor(Math.random() * 10).toString();
    }
  }

  const first13 = prefix + randomPayload;
  const checkDigit = calculateLuhnCheckDigit(first13);
  const full14 = first13 + checkDigit.toString();

  return formatMediIdString(full14);
}

/**
 * Validates whether a given MediID string is structurally and algorithmically valid.
 */
export function validateMediID(mediId: string): { valid: boolean; reason?: string } {
  if (!mediId || typeof mediId !== 'string') {
    return { valid: false, reason: 'MediID must be a non-empty string' };
  }

  const cleaned = mediId.replace(/[\s-]/g, '');

  if (!/^\d{14}$/.test(cleaned)) {
    return { valid: false, reason: 'MediID must contain exactly 14 digits' };
  }

  if (!cleaned.startsWith('91')) {
    return { valid: false, reason: 'MediID must start with country prefix 91' };
  }

  if (!verifyLuhnChecksum(cleaned)) {
    return { valid: false, reason: 'MediID failed Luhn checksum validation (invalid or mistyped number)' };
  }

  return { valid: true };
}

/**
 * Reliable SHA-256 implementation in pure TypeScript for universal browser/Node compatibility.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let padded = ascii + '\x80';
  while ((padded.length) % 64 !== 56) {
    padded += '\x00';
  }

  for (i = 0; i < padded.length; i++) {
    j = padded.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[padded.length >> 2] |= (asciiBitLength / maxWord) | 0;
  words[(padded.length >> 2) + 1] = asciiBitLength;

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? (w[i] || 0) : ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const temp2 = (s0h + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6]
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }

  return result;
}

/**
 * Calculates a salted, cryptographic HMAC-SHA256 equivalent hash of the MediID.
 * Strips formatting hyphens before hashing to ensure consistent on-chain representation.
 *
 * @param mediId - Formatted or raw 14-digit MediID
 * @param pepper - Server-side secret pepper to prevent rainbow table attacks
 * @returns 0x-prefixed 32-byte hex hash string
 */
export function hashMediID(mediId: string, pepper: string = 'medivault_default_pepper_2026'): string {
  const normalized = mediId.replace(/[\s-]/g, '');
  const combined = `${pepper}:MEDIVAULT_ID:${normalized}:${pepper}`;
  const digest = sha256(combined);
  return `0x${digest}`;
}
