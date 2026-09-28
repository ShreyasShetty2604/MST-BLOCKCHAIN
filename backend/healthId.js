import crypto from 'crypto';

// Server-side pepper for HMAC-SHA256 (Never plain SHA-256)
const SERVER_PEPPER = process.env.HEALTH_ID_PEPPER || 'medivault-hmac-secret-pepper-hackathon-2026';

/**
 * Luhn Algorithm Checksum calculation for numeric strings
 */
export function calculateLuhnChecksum(digitString) {
  let sum = 0;
  let shouldDouble = true;
  
  for (let i = digitString.length - 1; i >= 0; i--) {
    let digit = parseInt(digitString.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return checksum;
}

/**
 * Validates a full digit string with Luhn checksum appended at the end
 */
export function validateLuhn(fullDigits) {
  let sum = 0;
  let shouldDouble = false;

  for (let i = fullDigits.length - 1; i >= 0; i--) {
    let digit = parseInt(fullDigits.charAt(i), 10);
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
 * Generates a 14-digit Health ID formatted as `91-XXXX-XXXX-XXXX`
 * Prefix '91' + 11 random digits + 1 Luhn checksum digit = 14 digits total
 */
export function generateHealthId() {
  const prefix = '91';
  let randomBody = '';
  for (let i = 0; i < 11; i++) {
    randomBody += Math.floor(Math.random() * 10).toString();
  }
  
  const payloadDigits = prefix + randomBody; // 13 digits
  const checksumDigit = calculateLuhnChecksum(payloadDigits);
  const full14Digits = payloadDigits + checksumDigit.toString(); // 14 digits

  // Format as 91-XXXX-XXXX-XXXX
  const formatted = `${full14Digits.slice(0, 2)}-${full14Digits.slice(2, 6)}-${full14Digits.slice(6, 10)}-${full14Digits.slice(10, 14)}`;

  return {
    raw: full14Digits,
    formatted,
    isValid: validateLuhn(full14Digits)
  };
}

/**
 * Validates a formatted or unformatted Health ID string
 */
export function verifyHealthIdFormat(healthId) {
  const digitsOnly = healthId.replace(/\D/g, '');
  if (digitsOnly.length !== 14) {
    return { isValid: false, reason: 'Health ID must contain exactly 14 digits' };
  }
  const isLuhnValid = validateLuhn(digitsOnly);
  return {
    isValid: isLuhnValid,
    digits: digitsOnly,
    formatted: `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}-${digitsOnly.slice(10, 14)}`
  };
}

/**
 * Hashes the Health ID using HMAC-SHA256 with server-side pepper
 * Returns bytes32 formatted hex string (0x...) for Smart Contract storage
 */
export function hashHealthIdWithHMAC(healthId, pepper = SERVER_PEPPER) {
  const digitsOnly = healthId.replace(/\D/g, '');
  const hmac = crypto.createHmac('sha256', pepper);
  hmac.update(digitsOnly);
  const digestHex = hmac.digest('hex');
  return `0x${digestHex}`;
}
