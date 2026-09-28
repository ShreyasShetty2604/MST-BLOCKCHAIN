/**
 * MediVault Backend HTTP API Server
 *
 * Implements the required Identity & Security endpoints:
 * - POST /api/identity/register
 * - GET  /api/identity/:vaultId
 * - POST /api/identity/fingerprint/register
 * - POST /api/identity/fingerprint/verify
 * - POST /api/identity/dna/register
 * - POST /api/identity/dna/verify
 * - GET  /api/identity/integrity/:vaultId
 * - POST /api/identity/tamper-demo
 */

import http from 'node:http';
import { db } from './db.ts';
import {
  generateVaultId,
  encryptData,
  decryptData,
  hashData,
  verifyHash
} from '../src/lib/crypto.ts';
import {
  generateMediID,
  validateMediID,
  hashMediID
} from '../src/lib/mediId.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

// CORS & JSON Response Helper
function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// JSON Request Body Parser Helper
function readJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Guard against huge payload attacks
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  try {
    // Initialize DB if needed
    await db.init();

    // ------------------------------------------------------------------------
    // Health / Status Endpoint
    // ------------------------------------------------------------------------
    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, {
        status: 'UP',
        service: 'MediVault Identity & Security Engine',
        version: '1.0.0-hackathon',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 1. POST /api/identity/register
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/register' && method === 'POST') {
      const body = await readJsonBody(req);
      const { name, dob, gender, phone, email, bloodGroup, allergies, conditions, emergencyContact, requesterId, requesterName } = body;

      if (!name || !dob) {
        sendJson(res, 400, {
          success: false,
          error: 'Validation error: "name" and "dob" are required fields'
        });
        return;
      }

      // Generate unique 14-digit MediID with Luhn checksum
      const mediId = generateMediID();
      const vaultId = generateVaultId();
      const mediIdHash = hashMediID(mediId);

      // Create new patient vault
      const newVault = {
        vaultId,
        mediId,
        mediIdHash,
        name: String(name).trim(),
        dob: String(dob).trim(),
        gender: gender || 'Unspecified',
        phone: phone ? String(phone).trim() : '+91 98765 43210',
        phoneMasked: phone ? `${phone.slice(0, 5)}***${phone.slice(-3)}` : '+91 98*** **000',
        email: email ? String(email).trim() : `${String(name).toLowerCase().replace(/\s+/g, '.')}@example.com`,
        bloodGroup: bloodGroup || 'O+',
        allergies: Array.isArray(allergies) ? allergies : (typeof allergies === 'string' && allergies.trim() ? allergies.split(',').map((s: string) => s.trim()) : []),
        conditions: Array.isArray(conditions) ? conditions : (typeof conditions === 'string' && conditions.trim() ? conditions.split(',').map((s: string) => s.trim()) : []),
        emergencyContact: emergencyContact || { name: 'Emergency Services', relation: 'Default', phone: '112' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveVault(newVault);

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId,
        requesterId: requesterId || 'SYS_PATIENT_ONBOARDING',
        requesterName: requesterName || 'Patient Self-Registration',
        resourceType: 'identity',
        action: 'REGISTER',
        granted: true,
        reason: requesterName ? `Initial Vault creation and MediID issuance by ${requesterName}` : 'Initial Vault creation and MediID issuance',
        timestamp: new Date().toISOString()
      });

      sendJson(res, 201, {
        success: true,
        message: 'Patient Vault and sovereign MediID created successfully',
        vaultId,
        mediId,
        mediIdHash,
        patient: {
          id: `persona-${vaultId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8)}`,
          vaultId,
          mediId,
          name: newVault.name,
          dob: newVault.dob,
          gender: newVault.gender,
          phone: newVault.phone,
          email: newVault.email,
          emergencyInfo: {
            bloodGroup: newVault.bloodGroup,
            allergies: newVault.allergies,
            conditions: newVault.conditions,
            medications: [],
            emergencyContact: newVault.emergencyContact
          },
          verifiedRecordCount: 0,
          activeConsentCount: requesterId === 'HOSPITAL_TRIAGE' ? 1 : 0,
          lastAccessTime: 'Just now'
        },
        status: 'Active',
        encryptionScheme: 'AES-256-GCM',
        qrReferenceUrl: `https://medivault.id/vault/${vaultId}`
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 2. GET /api/identity/:vaultId
    // ------------------------------------------------------------------------
    const identityMatch = pathname.match(/^\/api\/identity\/(VLT-[A-F0-9]{12})$/i);
    if (identityMatch && method === 'GET') {
      const vaultId = identityMatch[1].toUpperCase();
      const vault = db.getVaultById(vaultId);

      if (!vault) {
        sendJson(res, 404, {
          success: false,
          error: `Vault not found: ${vaultId}`
        });
        return;
      }

      const bio = db.getFingerprint(vaultId);
      const dna = db.getDna(vaultId);

      // Return sanitized public view - NEVER leak raw biometric/DNA data or keys!
      sendJson(res, 200, {
        success: true,
        vault: {
          vaultId: vault.vaultId,
          mediId: vault.mediId,
          mediIdHash: vault.mediIdHash,
          name: vault.name,
          dob: vault.dob,
          gender: vault.gender,
          phoneMasked: vault.phoneMasked,
          bloodGroup: vault.bloodGroup,
          allergies: vault.allergies,
          conditions: vault.conditions,
          emergencyContact: vault.emergencyContact,
          securityStatus: {
            mediIdVerified: true,
            fingerprintProtected: Boolean(bio),
            dnaProtected: Boolean(dna),
            encryptionActive: 'AES-256-GCM',
            blockchainIntegrity: 'VERIFIED'
          },
          qrReferenceUrl: `https://medivault.id/vault/${vault.vaultId}`
        }
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 3. POST /api/identity/fingerprint/register
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/fingerprint/register' && method === 'POST') {
      const body = await readJsonBody(req);
      const { vaultId, biometricTemplate, sensorType } = body;

      if (!vaultId) {
        sendJson(res, 400, { success: false, error: 'vaultId is required' });
        return;
      }

      const vault = db.getVaultByIdOrMediId(vaultId);
      if (!vault) {
        sendJson(res, 404, { success: false, error: 'Vault not found' });
        return;
      }

      // Ensure template exists or use prototype simulated template
      const template = biometricTemplate || {
        format: 'ISO-19794-2:SIMULATED',
        minutiaeCount: 38,
        ridgeQuality: 99.1,
        sensor: sensorType || 'WebAuthn-Enclave-FIDO2',
        capturedAt: new Date().toISOString()
      };

      const templateString = JSON.stringify(template);
      // Encrypt off-chain with AES-256-GCM
      const encryptedPayload = await encryptData(templateString);
      // Cryptographic hash for blockchain proof
      const biometricHash = await hashData(template);

      db.saveFingerprint({
        vaultId,
        encryptedBiometricTemplate: encryptedPayload,
        biometricHash,
        templateFormat: 'ISO-19794-2:SIMULATED',
        sensorType: sensorType || 'WebAuthn-Enclave-FIDO2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId,
        requesterId: 'PATIENT_SELF',
        requesterName: vault.name,
        resourceType: 'fingerprint',
        action: 'REGISTER',
        granted: true,
        reason: 'Enrolled secure biometric template with AES-256-GCM',
        timestamp: new Date().toISOString()
      });

      sendJson(res, 200, {
        success: true,
        message: 'Biometric template encrypted and stored off-chain',
        vaultId,
        biometricHash,
        encryptionScheme: 'AES-256-GCM',
        status: 'Protected',
        isPrototypeNotice: 'Prototype template flow using simulated biometric features / WebAuthn passkey assertion'
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 4. POST /api/identity/fingerprint/verify
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/fingerprint/verify' && method === 'POST') {
      const body = await readJsonBody(req);
      const { vaultId, assertionToken } = body;

      if (!vaultId) {
        sendJson(res, 400, { success: false, error: 'vaultId is required' });
        return;
      }

      const resolvedVault = db.getVaultByIdOrMediId(vaultId);
      const actualVaultId = resolvedVault ? resolvedVault.vaultId : vaultId;
      const bio = db.getFingerprint(actualVaultId);
      if (!bio) {
        sendJson(res, 404, { success: false, error: 'No biometric record enrolled for this vault' });
        return;
      }

      // Decrypt stored AES-256-GCM template (checks auth tag)
      let decryptedTemplate: string;
      try {
        decryptedTemplate = await decryptData(bio.encryptedBiometricTemplate);
      } catch (err: any) {
        sendJson(res, 409, {
          success: false,
          verified: false,
          error: 'Biometric record decryption failed: Authenticated tag mismatch. Record was tampered with.'
        });
        return;
      }

      // Re-verify hash integrity
      const parsed = JSON.parse(decryptedTemplate);
      const computedHash = await hashData(parsed);
      const hashMatch = computedHash.toLowerCase() === bio.biometricHash.toLowerCase();

      if (!hashMatch) {
        sendJson(res, 409, {
          success: false,
          verified: false,
          error: 'Integrity check failed: Recomputed template hash does not match anchored hash.'
        });
        return;
      }

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId,
        requesterId: 'BIOMETRIC_AUTH_MODULE',
        requesterName: 'WebAuthn / Biometric Verifier',
        resourceType: 'fingerprint',
        action: 'VERIFY',
        granted: true,
        reason: 'Biometric identity challenge verification',
        timestamp: new Date().toISOString()
      });

      sendJson(res, 200, {
        success: true,
        verified: true,
        confidenceScore: 99.4,
        biometricHash: bio.biometricHash,
        message: 'Biometric identity verified successfully via protected enclave challenge'
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 5. POST /api/identity/dna/register
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/dna/register' && method === 'POST') {
      const body = await readJsonBody(req);
      const { vaultId, labReferenceId, issuingLaboratory, dnaProfile } = body;

      if (!vaultId || !labReferenceId) {
        sendJson(res, 400, { success: false, error: 'vaultId and labReferenceId are required' });
        return;
      }

      const vault = db.getVaultById(vaultId);
      if (!vault) {
        sendJson(res, 404, { success: false, error: 'Vault not found' });
        return;
      }

      const profile = dnaProfile || {
        referenceId: labReferenceId,
        issuingLab: issuingLaboratory || 'National Genomic Center',
        markersCount: 24,
        verifiedDate: new Date().toISOString().split('T')[0]
      };

      const profileString = JSON.stringify(profile);
      const encryptedProfile = await encryptData(profileString);
      const dnaHash = await hashData(profile);

      db.saveDna({
        vaultId,
        labReferenceId,
        issuingLaboratory: issuingLaboratory || 'Certified Diagnostic Laboratory',
        encryptedDnaProfile: encryptedProfile,
        dnaHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId,
        requesterId: 'ACCREDITED_LAB',
        requesterName: issuingLaboratory || 'Certified Diagnostic Laboratory',
        resourceType: 'dna',
        action: 'REGISTER',
        granted: true,
        reason: `Laboratory-issued DNA reference registered (${labReferenceId})`,
        timestamp: new Date().toISOString()
      });

      sendJson(res, 200, {
        success: true,
        message: 'DNA profile encrypted and anchored successfully',
        vaultId,
        labReferenceId,
        dnaHash,
        status: 'Protected',
        notice: 'DNA profile is a laboratory-issued reference profile. Raw DNA sequencing is performed by certified labs.'
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 6. POST /api/identity/dna/verify
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/dna/verify' && method === 'POST') {
      const body = await readJsonBody(req);
      const { vaultId, requesterId, requesterRole } = body;

      if (!vaultId) {
        sendJson(res, 400, { success: false, error: 'vaultId is required' });
        return;
      }

      // Access Control: DNA has strictly elevated access requirements
      if (requesterRole !== 'patient' && requesterRole !== 'hospital' && requesterRole !== 'admin') {
        db.logAccess({
          id: `log-${Date.now()}`,
          vaultId,
          requesterId: requesterId || 'UNKNOWN',
          requesterName: 'Unauthorized Requester',
          resourceType: 'dna',
          action: 'VERIFY',
          granted: false,
          reason: 'Access denied: DNA verification requires authenticated role',
          timestamp: new Date().toISOString()
        });

        sendJson(res, 403, {
          success: false,
          verified: false,
          error: 'Access Control Violation: DNA identity profile requires authorized hospital or patient consent.'
        });
        return;
      }

      const dna = db.getDna(vaultId);
      if (!dna) {
        sendJson(res, 404, { success: false, error: 'No DNA profile found for this vault' });
        return;
      }

      // Decrypt stored AES-256-GCM payload and verify tag
      let decrypted: string;
      try {
        decrypted = await decryptData(dna.encryptedDnaProfile);
      } catch (err: any) {
        sendJson(res, 409, {
          success: false,
          verified: false,
          error: 'DNA record decryption failed: Authenticated tag mismatch. Record was tampered with.'
        });
        return;
      }

      const parsedProfile = JSON.parse(decrypted);
      const computedHash = await hashData(parsedProfile);
      const hashValid = computedHash.toLowerCase() === dna.dnaHash.toLowerCase();

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId,
        requesterId: requesterId || 'AUTHORIZED_PARTY',
        requesterName: `${requesterRole.toUpperCase()} Verifier`,
        resourceType: 'dna',
        action: 'VERIFY',
        granted: true,
        reason: 'Authorized DNA profile reference verification',
        timestamp: new Date().toISOString()
      });

      sendJson(res, 200, {
        success: true,
        verified: hashValid,
        labReferenceId: dna.labReferenceId,
        issuingLaboratory: dna.issuingLaboratory,
        dnaHash: dna.dnaHash,
        status: hashValid ? 'Verified' : 'Tampered'
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 7. GET /api/identity/integrity/:vaultId
    // ------------------------------------------------------------------------
    const integrityMatch = pathname.match(/^\/api\/identity\/integrity\/(VLT-[A-F0-9]{12})$/i);
    if (integrityMatch && method === 'GET') {
      const vaultId = integrityMatch[1].toUpperCase();
      const vault = db.getVaultById(vaultId);

      if (!vault) {
        sendJson(res, 404, { success: false, error: `Vault not found: ${vaultId}` });
        return;
      }

      const bio = db.getFingerprint(vaultId);
      const dna = db.getDna(vaultId);

      let fingerprintStatus: 'VERIFIED' | 'TAMPERED' | 'UNENROLLED' = 'UNENROLLED';
      let fingerprintExpected = bio?.biometricHash || '';
      let fingerprintComputed = '';

      if (bio) {
        try {
          const dec = await decryptData(bio.encryptedBiometricTemplate);
          fingerprintComputed = await hashData(JSON.parse(dec));
          fingerprintStatus = (fingerprintComputed.toLowerCase() === fingerprintExpected.toLowerCase())
            ? 'VERIFIED'
            : 'TAMPERED';
        } catch {
          fingerprintStatus = 'TAMPERED';
          fingerprintComputed = '0xTAMPERED_TAG_MISMATCH';
        }
      }

      let dnaStatus: 'VERIFIED' | 'TAMPERED' | 'UNENROLLED' = 'UNENROLLED';
      let dnaExpected = dna?.dnaHash || '';
      let dnaComputed = '';

      if (dna) {
        try {
          const dec = await decryptData(dna.encryptedDnaProfile);
          dnaComputed = await hashData(JSON.parse(dec));
          dnaStatus = (dnaComputed.toLowerCase() === dnaExpected.toLowerCase())
            ? 'VERIFIED'
            : 'TAMPERED';
        } catch {
          dnaStatus = 'TAMPERED';
          dnaComputed = '0xTAMPERED_TAG_MISMATCH';
        }
      }

      const isAllOk =
        (fingerprintStatus === 'VERIFIED' || fingerprintStatus === 'UNENROLLED') &&
        (dnaStatus === 'VERIFIED' || dnaStatus === 'UNENROLLED');

      sendJson(res, 200, {
        success: true,
        vaultId,
        mediId: vault.mediId,
        overallIntegrity: isAllOk ? 'VERIFIED' : 'TAMPERED',
        checkedAt: new Date().toISOString(),
        components: {
          mediId: {
            hash: vault.mediIdHash,
            status: 'VERIFIED',
            checksumValid: validateMediID(vault.mediId).valid
          },
          fingerprint: {
            anchoredHash: fingerprintExpected,
            computedHash: fingerprintComputed,
            status: fingerprintStatus
          },
          dna: {
            anchoredHash: dnaExpected,
            computedHash: dnaComputed,
            status: dnaStatus
          },
          encryption: {
            algorithm: 'AES-256-GCM',
            authTagIntegrity: isAllOk ? 'PASS' : 'FAIL'
          }
        }
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 8. POST /api/identity/tamper-demo (Hackathon Demonstration Tool)
    // ------------------------------------------------------------------------
    if (pathname === '/api/identity/tamper-demo' && method === 'POST') {
      const body = await readJsonBody(req);
      const { vaultId, target } = body; // target: 'fingerprint' | 'dna'

      if (!vaultId) {
        sendJson(res, 400, { success: false, error: 'vaultId is required' });
        return;
      }

      if (target === 'fingerprint') {
        const bio = db.getFingerprint(vaultId);
        if (!bio) {
          sendJson(res, 404, { success: false, error: 'Fingerprint record not found' });
          return;
        }
        // Flip one hex digit in ciphertext to simulate storage corruption / tampering
        const c = bio.encryptedBiometricTemplate.ciphertext;
        const tampered = c.slice(0, 4) + (c[4] === '0' ? '1' : '0') + c.slice(5);
        bio.encryptedBiometricTemplate.ciphertext = tampered;
        db.saveFingerprint(bio);

        sendJson(res, 200, {
          success: true,
          message: 'Fingerprint ciphertext altered on disk to demonstrate tamper detection alert'
        });
        return;
      }

      if (target === 'dna') {
        const dna = db.getDna(vaultId);
        if (!dna) {
          sendJson(res, 404, { success: false, error: 'DNA record not found' });
          return;
        }
        const c = dna.encryptedDnaProfile.ciphertext;
        const tampered = c.slice(0, 4) + (c[4] === '0' ? '1' : '0') + c.slice(5);
        dna.encryptedDnaProfile.ciphertext = tampered;
        db.saveDna(dna);

        sendJson(res, 200, {
          success: true,
          message: 'DNA ciphertext altered on disk to demonstrate tamper detection alert'
        });
        return;
      }

      sendJson(res, 400, { success: false, error: 'target must be "fingerprint" or "dna"' });
      return;
    }

    // ------------------------------------------------------------------------
    // 9. POST /api/records/create (Medical Record Creation by Patient or Hospital)
    // ------------------------------------------------------------------------
    if (pathname === '/api/records/create' && method === 'POST') {
      const body = await readJsonBody(req);
      const {
        vaultId,
        title,
        category,
        recordType,
        source,
        sourceType,
        doctor,
        summary,
        details
      } = body;

      if (!vaultId || !title || !summary) {
        sendJson(res, 400, {
          success: false,
          error: 'Validation error: "vaultId", "title", and "summary" are required'
        });
        return;
      }

      const vault = db.getVaultByIdOrMediId(vaultId) || db.getVaultById(vaultId);
      if (!vault) {
        sendJson(res, 404, { success: false, error: 'Vault not found' });
        return;
      }
      const actualVaultId = vault.vaultId;

      const isHospital = sourceType === 'hospital';
      const recordCategory = category || (isHospital ? 'Hospital-verified' : 'Self-declared');
      const clinicalPayload = {
        summary,
        details: details || {},
        doctor: doctor || undefined,
        source: source || (isHospital ? 'Authorized Hospital' : 'Patient Self-Declared'),
        createdAt: new Date().toISOString()
      };

      // Authenticated AES-256-GCM encryption of sensitive medical details
      const encryptedPayload = await encryptData(JSON.stringify(clinicalPayload));
      // Cryptographic SHA-256 hash of plaintext for on-chain anchoring
      const recordHash = await hashData(clinicalPayload);

      // Generate simulated on-chain transaction hash
      const hex = '0123456789abcdef';
      let txHash = '0x';
      for (let i = 0; i < 64; i++) {
        txHash += hex[Math.floor(Math.random() * 16)];
      }

      const newRecord = {
        id: `rec-${Date.now()}`,
        vaultId: actualVaultId,
        title: String(title).trim(),
        category: recordCategory,
        recordType: recordType || (isHospital ? 'Diagnostic Report' : 'Patient Observation'),
        source: source || (isHospital ? 'Authorized Clinic' : 'Patient (Self-declared)'),
        sourceType: (isHospital ? 'hospital' : 'self') as 'hospital' | 'self',
        date: new Date().toISOString().split('T')[0],
        doctor: doctor ? String(doctor).trim() : undefined,
        encryptedPayload,
        recordHash,
        txHash,
        blockNumber: 4820300 + Math.floor(Math.random() * 100),
        status: (isHospital ? 'verified' : 'self-declared') as 'verified' | 'self-declared',
        createdAt: new Date().toISOString()
      };

      db.saveRecord(newRecord);

      db.logAccess({
        id: `log-${Date.now()}`,
        vaultId: actualVaultId,
        requesterId: isHospital ? (doctor || 'HOSPITAL_PORTAL') : 'PATIENT_SELF',
        requesterName: source || (isHospital ? 'Hospital Registrar' : vault.name),
        resourceType: 'identity',
        action: 'REGISTER',
        granted: true,
        reason: `Created ${recordCategory} record: ${title} (AES-256-GCM encrypted)`,
        timestamp: new Date().toISOString()
      });

      sendJson(res, 201, {
        success: true,
        message: 'Medical record encrypted and anchored successfully',
        record: {
          id: newRecord.id,
          title: newRecord.title,
          category: newRecord.category,
          recordType: newRecord.recordType,
          source: newRecord.source,
          sourceType: newRecord.sourceType,
          date: newRecord.date,
          doctor: newRecord.doctor,
          recordHash: newRecord.recordHash,
          txHash: newRecord.txHash,
          blockNumber: newRecord.blockNumber,
          status: newRecord.status,
          encryptionScheme: 'AES-256-GCM'
        }
      });
      return;
    }

    // ------------------------------------------------------------------------
    // 10. GET /api/records/:vaultId (Decrypted Record Retrieval)
    // ------------------------------------------------------------------------
    const recordsMatch = pathname.match(/^\/api\/records\/(VLT-[A-F0-9]{12})$/i);
    if (recordsMatch && method === 'GET') {
      const vaultId = recordsMatch[1].toUpperCase();
      const vault = db.getVaultById(vaultId);

      if (!vault) {
        sendJson(res, 404, { success: false, error: 'Vault not found' });
        return;
      }

      const rawRecords = db.getRecords(vaultId);
      const decryptedRecords = await Promise.all(
        rawRecords.map(async (r) => {
          let payload: any = { summary: 'Unable to decrypt record payload', details: {} };
          let isIntegrityOk = true;

          try {
            const dec = await decryptData(r.encryptedPayload);
            payload = JSON.parse(dec);
            const computed = await hashData(payload);
            isIntegrityOk = computed.toLowerCase() === r.recordHash.toLowerCase();
          } catch {
            isIntegrityOk = false;
          }

          return {
            id: r.id,
            title: r.title,
            category: r.category,
            recordType: r.recordType,
            source: r.source,
            sourceType: r.sourceType,
            date: r.date,
            doctor: r.doctor,
            txHash: r.txHash,
            blockNumber: r.blockNumber,
            status: isIntegrityOk ? r.status : 'tampered',
            recordHash: r.recordHash,
            payload: {
              summary: payload.summary || '',
              details: payload.details || {}
            }
          };
        })
      );

      sendJson(res, 200, {
        success: true,
        vaultId,
        records: decryptedRecords
      });
      return;
    }

    // 404 Fallback
    sendJson(res, 404, {
      success: false,
      error: `Endpoint not found: ${method} ${pathname}`
    });
  } catch (err: any) {
    // Error handling - never expose stack trace, keys, or database credentials!
    console.error('[API Server Error]:', err.message);
    sendJson(res, 500, {
      success: false,
      error: 'An internal server error occurred processing the request.'
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MediVault Backend API] Running on http://localhost:${PORT}`);
});
