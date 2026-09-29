import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateHealthId, verifyHealthIdFormat, hashHealthIdWithHMAC } from './healthId.js';
import { encryptAndStoreRecord, decryptRecord, getRecordFromStorage, verifyRecordIntegrity } from './encryption.js';
import { checkOnChainAccess, relayAddRecord, verifyHospitalSignature } from './relayerService.js';
import { saveRecordToSupabase, saveUserToSupabase, saveFingerprintToSupabase, saveConsentToSupabase, saveAuditLogToSupabase } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Load mock LLM responses for venue Wi-Fi resilience
let mockLlmData = {};
try {
  const raw = fs.readFileSync(path.join(__dirname, 'mock_llm_responses.json'), 'utf-8');
  mockLlmData = JSON.parse(raw);
} catch (err) {
  console.warn('Warning: mock_llm_responses.json not loaded, fallback enabled');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'MediVault Core Backend API (Phase 4 Active)',
    network: 'MST Testnet (91562037) / MST Mainnet (4646)',
    modules: ['HealthID Generator', 'HMAC-SHA256', 'AES-256-GCM', 'On-Chain Access Gate', 'Relayer Service', 'Integrity Verifier'],
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 1. HEALTH ID GENERATOR & HMAC HASHER
// ==========================================

app.post('/api/health-id/generate', (req, res) => {
  const healthId = generateHealthId();
  const hmacHash = hashHealthIdWithHMAC(healthId.formatted);

  res.json({
    success: true,
    healthId: healthId.formatted,
    rawDigits: healthId.raw,
    isValidLuhn: healthId.isValid,
    hmacHash, // Never plain SHA-256
    algorithm: 'HMAC-SHA256 (Server Peppered)'
  });
});

app.post('/api/health-id/verify', (req, res) => {
  const { healthId } = req.body;
  if (!healthId) {
    return res.status(400).json({ error: 'Missing healthId' });
  }

  const formatCheck = verifyHealthIdFormat(healthId);
  if (!formatCheck.isValid) {
    return res.status(400).json({ isValid: false, reason: formatCheck.reason || 'Invalid Luhn Checksum' });
  }

  const hmacHash = hashHealthIdWithHMAC(formatCheck.formatted);
  res.json({
    isValid: true,
    formatted: formatCheck.formatted,
    hmacHash
  });
});

// ==========================================
// 2. ENCRYPTED RECORD UPLOAD & ON-CHAIN ANCHORING
// ==========================================

app.post('/api/records/upload', async (req, res) => {
  try {
    const { plaintextData, vaultId, recordType, source } = req.body;

    if (!plaintextData || !vaultId) {
      return res.status(400).json({ error: 'Missing required plaintextData or vaultId' });
    }

    // 1. Encrypt record with AES-256-GCM and store in local storage (mock Pinata IPFS)
    const { fileId, storageUri, payloadHash, recordPackage } = encryptAndStoreRecord(plaintextData, vaultId);

    // Sync encrypted payload asynchronously to Supabase Postgres database
    saveRecordToSupabase({ fileId, vaultId, payloadHash, recordPackage });

    // 2. Relay payload hash to smart contract on-chain
    const relayResult = await relayAddRecord(
      vaultId,
      payloadHash,
      recordType || 'Diagnostic Laboratory',
      source || 'Metro Diagnostic Labs'
    );

    res.json({
      success: true,
      fileId,
      storageUri,
      payloadHash,
      encryptionAlgorithm: 'AES-256-GCM',
      onChainTx: relayResult
    });
  } catch (err) {
    console.error('Record upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. ON-CHAIN ACCESS GATE & DECRYPTION READ
// ==========================================

app.post('/api/records/read', async (req, res) => {
  try {
    const { vaultId, storageUri, accessorAddress, requiredTier } = req.body;

    if (!vaultId || !storageUri || !accessorAddress) {
      return res.status(400).json({ error: 'Missing required parameters: vaultId, storageUri, accessorAddress' });
    }

    // 1. ON-CHAIN ACCESS GATE CHECK
    const tier = requiredTier !== undefined ? requiredTier : 1;
    const accessCheck = await checkOnChainAccess(vaultId, accessorAddress, tier);

    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        error: 'Access Denied: Requester does not hold active on-chain consent for this vault',
        vaultId,
        accessorAddress,
        requiredTier: tier
      });
    }

    // 2. FETCH CIPHERTEXT FROM STORAGE AND DECRYPT
    const recordPackage = getRecordFromStorage(storageUri);
    const decryptedPayload = decryptRecord(recordPackage);

    res.json({
      success: true,
      accessGate: 'Passed On-Chain Consent Check',
      accessCheckDetails: accessCheck,
      decryptedData: decryptedPayload,
      payloadHash: recordPackage.payloadHash
    });
  } catch (err) {
    console.error('Record read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. INTEGRITY CHECK ENDPOINT
// ==========================================

app.post('/api/records/verify-integrity', (req, res) => {
  try {
    const { storageUri, expectedOnChainHash } = req.body;

    if (!storageUri || !expectedOnChainHash) {
      return res.status(400).json({ error: 'Missing storageUri or expectedOnChainHash' });
    }

    const recordPackage = getRecordFromStorage(storageUri);
    const integrityResult = verifyRecordIntegrity(recordPackage, expectedOnChainHash);

    res.json({
      success: true,
      isIntegrityValid: integrityResult.isValid,
      recalculatedPayloadHash: integrityResult.recalculatedPayloadHash,
      expectedOnChainHash: integrityResult.expectedHash,
      status: integrityResult.isValid ? 'TAMPER-PROOF VERIFIED' : 'INTEGRITY MISMATCH DETECTED'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. HOSPITAL SIGNATURE VERIFICATION
// ==========================================

app.post('/api/hospital/verify-signature', async (req, res) => {
  try {
    const { message, signature, hospitalAddress } = req.body;

    if (!message || !signature || !hospitalAddress) {
      return res.status(400).json({ error: 'Missing message, signature, or hospitalAddress' });
    }

    const verification = await verifyHospitalSignature(message, signature, hospitalAddress);
    res.json(verification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. USER REGISTRATION & VAULT CREATION
// ==========================================

app.post('/api/users/register', async (req, res) => {
  try {
    const { name, dob, gender, phone, email, emergencyInfo } = req.body;
    
    // Generate Luhn MediID & HMAC peppered hash
    const healthId = generateHealthId();
    const hmacHash = hashHealthIdWithHMAC(healthId.formatted);
    const vaultId = 'VLT-' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
    const dnaSaltedHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const userData = {
      vaultId,
      mediId: healthId.formatted,
      name: name || 'New Sovereign Patient',
      dob: dob || '1995-06-20',
      gender: gender || 'Other',
      phone: phone || '+91 98765 00000',
      email: email || 'patient@medivault.io',
      dnaSaltedHash,
      emergencyInfo: emergencyInfo || { bloodGroup: 'O+', allergies: [], conditions: [] }
    };

    // Save user profile to Supabase database
    await saveUserToSupabase(userData);

    res.json({
      success: true,
      vaultId,
      mediId: healthId.formatted,
      hmacHash,
      dnaSaltedHash,
      userData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. FINGERPRINT & WEBAUTHN BIOMETRIC ENROLLMENT
// ==========================================

app.post('/api/biometrics/register', async (req, res) => {
  try {
    const { personaId, vaultId, credentialId, kind, label } = req.body;
    if (!personaId || !credentialId) {
      return res.status(400).json({ error: 'Missing personaId or credentialId' });
    }

    const credData = {
      credentialId,
      personaId,
      vaultId: vaultId || 'VLT-8F29A31B72C1',
      kind: kind || 'webauthn',
      label: label || 'WebAuthn Fingerprint Enclave',
      publicKeyHash: credentialId
    };

    // Save biometric credential token to Supabase table `fingerprint_credentials`
    await saveFingerprintToSupabase(credData);

    res.json({
      success: true,
      registeredAt: new Date().toISOString(),
      credential: credData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. CONSENT & AUDIT LOG SYNC
// ==========================================

app.post('/api/consents/sync', async (req, res) => {
  try {
    const consentData = req.body;
    await saveConsentToSupabase(consentData);
    res.json({ success: true, consent: consentData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/audit-logs/sync', async (req, res) => {
  try {
    const auditData = req.body;
    await saveAuditLogToSupabase(auditData);
    res.json({ success: true, auditLog: auditData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXISTING PATIENT & AI ENDPOINTS
// ==========================================

app.get('/api/patient/me', (req, res) => {
  res.json({
    mediId: '91-2345-6789-0123',
    name: 'Rajesh Kumar',
    dob: '1974-05-14',
    bloodGroup: 'B+',
    status: 'Verified Sovereign Vault'
  });
});

app.get('/api/patient/:mediId', (req, res) => {
  const { mediId } = req.params;
  res.json({
    mediId,
    name: 'Rajesh Kumar',
    dob: '1974-05-14',
    emergencyInfo: {
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Dust Mites'],
      conditions: ['Type 2 Diabetes Mellitus', 'Mild Hypertension'],
      emergencyContact: { name: 'Sunita Kumar', phone: '+91 98765 43211' }
    }
  });
});

app.post('/api/ai/guidance', (req, res) => {
  const { query } = req.body;
  const lower = (query || '').toLowerCase();

  if (lower.includes('chest pain') || lower.includes('breathless') || lower.includes('unconscious')) {
    return res.json(mockLlmData.emergency_chest_pain || {
      isRedFlag: true,
      emergencyNotice: 'CRITICAL EMERGENCY SYMPTOM DETECTED — SEEK EMERGENCY CARE IMMEDIATELY'
    });
  }

  if (lower.includes('headache')) {
    return res.json(mockLlmData.metformin_headache);
  }

  if (lower.includes('numbness')) {
    return res.json(mockLlmData.foot_numbness);
  }

  return res.json(mockLlmData.fasting_glucose_145 || {
    query,
    structuredReply: {
      pointTo: ['General glycemic health variation'],
      whatToDo: ['Maintain prescribed hydration and medication timing'],
      whenDoctor: ['If symptoms persist for 48 hours']
    }
  });
});

app.listen(PORT, () => {
  console.log(`MediVault Core Backend API (Phase 4 Ready) running at http://localhost:${PORT}`);
});
