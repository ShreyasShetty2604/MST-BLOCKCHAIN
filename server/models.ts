/**
 * MediVault Backend Database Models & Schemas
 *
 * Architecture Principles:
 * - Patient/Vault table maps public MediID to internal Vault ID.
 * - Biometric and DNA records store AES-256-GCM ciphertexts only.
 * - Raw biometric images or raw DNA sequences are NEVER stored.
 * - Hashes are SHA-256 digests suitable for blockchain integrity proofs.
 */

import type { EncryptedPayload } from '../src/lib/crypto.ts';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface PatientVaultModel {
  vaultId: string;               // e.g. VLT-8F29A31B72C1
  mediId: string;                // e.g. 91-4827-6153-2048
  mediIdHash: string;            // 0x-prefixed salted HMAC-SHA256
  name: string;
  dob: string;
  gender: string;
  phoneMasked: string;
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  emergencyContact: EmergencyContact;
  createdAt: string;
  updatedAt: string;
}

export interface FingerprintModel {
  vaultId: string;
  encryptedBiometricTemplate: EncryptedPayload;
  biometricHash: string;         // SHA-256 hash of plaintext template
  templateFormat: string;        // e.g. 'ISO-19794-2:SIMULATED'
  sensorType: string;            // e.g. 'WebAuthn-Enclave-FIDO2'
  createdAt: string;
  updatedAt: string;
}

export interface DnaModel {
  vaultId: string;
  labReferenceId: string;        // e.g. DNA-LAB-829173
  issuingLaboratory: string;     // Authorized diagnostic center
  encryptedDnaProfile: EncryptedPayload;
  dnaHash: string;               // SHA-256 hash of DNA reference profile
  createdAt: string;
  updatedAt: string;
}

export interface AccessLogModel {
  id: string;
  vaultId: string;
  requesterId: string;
  requesterName: string;
  resourceType: 'identity' | 'fingerprint' | 'dna' | 'emergency';
  action: 'READ' | 'VERIFY' | 'REGISTER';
  granted: boolean;
  reason: string;
  timestamp: string;
}

export interface MedicalRecordModel {
  id: string;
  vaultId: string;
  title: string;
  category: string;
  recordType: string;
  source: string;
  sourceType: 'hospital' | 'self';
  date: string;
  doctor?: string;
  encryptedPayload: EncryptedPayload;
  recordHash: string; // SHA-256 of plaintext details
  txHash: string;
  blockNumber: number;
  status: 'verified' | 'self-declared' | 'tampered';
  createdAt: string;
}
