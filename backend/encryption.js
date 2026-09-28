import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(__dirname, 'storage', 'records');

// Ensure local storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Master encryption key (in production, derived per-vault using HKDF/ECDH)
const MASTER_ENCRYPTION_KEY = process.env.RECORD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypts a plaintext record using AES-256-GCM
 * Returns payload hash (SHA-256), IV, authTag, ciphertext, and storage IPFS CID/URI
 */
export function encryptAndStoreRecord(plaintextData, vaultId, keyHex = MASTER_ENCRYPTION_KEY) {
  const key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = crypto.randomBytes(12); // 96-bit IV for AES-GCM
  
  const jsonString = typeof plaintextData === 'string' ? plaintextData : JSON.stringify(plaintextData);
  
  // Calculate SHA-256 Payload Hash (0x...) for Smart Contract anchoring
  const sha256 = crypto.createHash('sha256').update(jsonString).digest('hex');
  const payloadHash = `0x${sha256}`;

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(jsonString, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  const recordPackage = {
    payloadHash,
    vaultId,
    iv: iv.toString('hex'),
    authTag,
    ciphertext,
    createdAt: new Date().toISOString()
  };

  // Store in local storage (mock Pinata IPFS)
  const fileId = `rec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const filePath = path.join(STORAGE_DIR, `${fileId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(recordPackage, null, 2), 'utf-8');

  return {
    fileId,
    storageUri: `ipfs://${fileId}`,
    payloadHash,
    recordPackage
  };
}

/**
 * Decrypts an encrypted record package using AES-256-GCM
 */
export function decryptRecord(recordPackage, keyHex = MASTER_ENCRYPTION_KEY) {
  const key = Buffer.from(keyHex.padEnd(64, '0').slice(0, 64), 'hex');
  const iv = Buffer.from(recordPackage.iv, 'hex');
  const authTag = Buffer.from(recordPackage.authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(recordPackage.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted);
  } catch (err) {
    return decrypted;
  }
}

/**
 * Reads encrypted record package from storage by fileId / URI
 */
export function getRecordFromStorage(fileIdOrUri) {
  const cleanId = fileIdOrUri.replace('ipfs://', '').replace('.json', '');
  const filePath = path.join(STORAGE_DIR, `${cleanId}.json`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Record not found in storage: ${cleanId}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Verifies integrity of a record: decrypts and compares recalculated SHA-256 hash with provided hash
 */
export function verifyRecordIntegrity(recordPackage, expectedHash) {
  const decryptedData = decryptRecord(recordPackage);
  const jsonString = typeof decryptedData === 'string' ? decryptedData : JSON.stringify(decryptedData);
  
  const rehashedHex = crypto.createHash('sha256').update(jsonString).digest('hex');
  const recalculatedPayloadHash = `0x${rehashedHex}`;

  const isMatching = recalculatedPayloadHash.toLowerCase() === expectedHash.toLowerCase();

  return {
    isValid: isMatching,
    recalculatedPayloadHash,
    expectedHash,
    decryptedData
  };
}
