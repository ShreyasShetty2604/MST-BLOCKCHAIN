/**
 * MediVault Local Persistence & Database Layer
 *
 * Implements off-chain encrypted persistence for:
 * - Patient Vaults
 * - Encrypted Fingerprint records
 * - Encrypted DNA records
 * - Access and Audit Logs
 */

import type {
  PatientVaultModel,
  FingerprintModel,
  DnaModel,
  AccessLogModel,
  MedicalRecordModel
} from './models.ts';
import { encryptData, hashData } from '../src/lib/crypto.ts';
import { generateMediID, hashMediID } from '../src/lib/mediId.ts';

class DatabaseStore {
  private vaults: Map<string, PatientVaultModel> = new Map();
  private mediIdToVault: Map<string, string> = new Map();
  private fingerprints: Map<string, FingerprintModel> = new Map();
  private dnaRecords: Map<string, DnaModel> = new Map();
  private medicalRecords: Map<string, MedicalRecordModel[]> = new Map();
  private accessLogs: AccessLogModel[] = [];
  private initialized: boolean = false;

  public async init() {
    if (this.initialized) return;

    // Seed Demo Patient: Rajesh Kumar
    const demoMediId = '91-4827-6153-2043'; // Verified Luhn MediID
    const demoVaultId = 'VLT-8F29A31B72C1';
    const mediIdHash = hashMediID(demoMediId);

    const demoVault: PatientVaultModel = {
      vaultId: demoVaultId,
      mediId: demoMediId,
      mediIdHash,
      name: 'Rajesh Kumar',
      dob: '1974-05-14',
      gender: 'Male',
      phoneMasked: '+91 98*** **210',
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      conditions: ['Type 2 Diabetes', 'Hypertension'],
      emergencyContact: {
        name: 'Sunita Kumar',
        relation: 'Spouse',
        phone: '+91 98765 00001'
      },
      createdAt: '2026-01-10T08:30:00Z',
      updatedAt: '2026-09-28T16:00:00Z'
    };

    this.vaults.set(demoVaultId, demoVault);
    this.mediIdToVault.set(demoMediId.replace(/[\s-]/g, ''), demoVaultId);

    // Seed Encrypted Biometric Template
    const demoFingerprintTemplate = {
      templateFormat: 'ISO-19794-2:SIMULATED',
      minutiaePoints: [
        { x: 124, y: 256, theta: 45, type: 'bifurcation' },
        { x: 180, y: 310, theta: 90, type: 'ridge_ending' },
        { x: 210, y: 195, theta: 135, type: 'core' }
      ],
      ridgeQuality: 98.6,
      sensorId: 'WebAuthn-Enclave-FIDO2',
      registeredAt: '2026-01-10T08:35:00Z'
    };

    const biometricPlaintext = JSON.stringify(demoFingerprintTemplate);
    const encryptedBio = await encryptData(biometricPlaintext);
    const bioHash = await hashData(demoFingerprintTemplate);

    this.fingerprints.set(demoVaultId, {
      vaultId: demoVaultId,
      encryptedBiometricTemplate: encryptedBio,
      biometricHash: bioHash,
      templateFormat: 'ISO-19794-2:SIMULATED',
      sensorType: 'WebAuthn-Enclave-FIDO2',
      createdAt: '2026-01-10T08:35:00Z',
      updatedAt: '2026-01-10T08:35:00Z'
    });

    // Seed Encrypted DNA Record (Laboratory-Issued Reference)
    const demoDnaProfile = {
      laboratoryId: 'LAB-IND-BLR-09',
      referenceId: 'DNA-LAB-829173',
      coDISMarkersCount: 24,
      accreditation: 'NABL-ISO-15189',
      sampleType: 'Buccal Swab',
      certifiedTimestamp: '2026-01-12T11:20:00Z'
    };

    const dnaPlaintext = JSON.stringify(demoDnaProfile);
    const encryptedDna = await encryptData(dnaPlaintext);
    const dnaHash = await hashData(demoDnaProfile);

    this.dnaRecords.set(demoVaultId, {
      vaultId: demoVaultId,
      labReferenceId: 'DNA-LAB-829173',
      issuingLaboratory: 'National Genomics Center (NABL)',
      encryptedDnaProfile: encryptedDna,
      dnaHash,
      createdAt: '2026-01-12T11:20:00Z',
      updatedAt: '2026-01-12T11:20:00Z'
    });

    // Seed Initial Encrypted Medical Records
    const hospPayload = {
      summary: 'Glycemic parameters show steady improvement with HbA1c at 6.9%.',
      details: {
        'Fasting Blood Sugar': '118 mg/dL',
        'HbA1c': '6.9%',
        'Blood Pressure': '124/82 mmHg'
      }
    };
    const hospEnc = await encryptData(JSON.stringify(hospPayload));
    const hospHash = await hashData(hospPayload);

    const selfPayload = {
      summary: 'Home glucometer check before breakfast.',
      details: {
        'Morning Fasting Reading': '112 mg/dL',
        'Physical Activity': '30 min brisk walk'
      }
    };
    const selfEnc = await encryptData(JSON.stringify(selfPayload));
    const selfHash = await hashData(selfPayload);

    this.medicalRecords.set(demoVaultId, [
      {
        id: 'rec-hosp-001',
        vaultId: demoVaultId,
        title: 'Quarterly Endocrinology & HbA1c Lab Report',
        category: 'Hospital-verified',
        recordType: 'Lab Report',
        source: 'City General Hospital',
        sourceType: 'hospital',
        date: '2026-09-15',
        doctor: 'Dr. A. R. Mehta',
        encryptedPayload: hospEnc,
        recordHash: hospHash,
        txHash: '0x3b8f12a9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f90123456789abcdef01234567',
        blockNumber: 4820110,
        status: 'verified',
        createdAt: '2026-09-15T10:30:00Z'
      },
      {
        id: 'rec-self-001',
        vaultId: demoVaultId,
        title: 'Morning Fasting Glucose Log',
        category: 'Self-declared',
        recordType: 'Vitals Log',
        source: 'Patient (Self-declared)',
        sourceType: 'self',
        date: '2026-09-27',
        encryptedPayload: selfEnc,
        recordHash: selfHash,
        txHash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        blockNumber: 4820240,
        status: 'self-declared',
        createdAt: '2026-09-27T07:15:00Z'
      }
    ]);

    this.initialized = true;
  }

  // Vault operations
  public getVaultById(vaultId: string): PatientVaultModel | undefined {
    return this.vaults.get(vaultId);
  }

  public getVaultByMediId(rawMediId: string): PatientVaultModel | undefined {
    const cleaned = rawMediId.replace(/[\s-]/g, '');
    const vaultId = this.mediIdToVault.get(cleaned);
    if (!vaultId) return undefined;
    return this.vaults.get(vaultId);
  }

  public getAllVaults(): PatientVaultModel[] {
    return Array.from(this.vaults.values());
  }

  public getVaultByIdOrMediId(query: string): PatientVaultModel | undefined {
    if (!query) return undefined;
    const direct = this.vaults.get(query);
    if (direct) return direct;
    const cleaned = query.replace(/[\s-]/g, '');
    const vaultId = this.mediIdToVault.get(cleaned);
    if (vaultId) return this.vaults.get(vaultId);
    return undefined;
  }

  public saveVault(vault: PatientVaultModel): void {
    this.vaults.set(vault.vaultId, vault);
    this.mediIdToVault.set(vault.mediId.replace(/[\s-]/g, ''), vault.vaultId);
  }

  // Biometrics operations
  public getFingerprint(vaultId: string): FingerprintModel | undefined {
    return this.fingerprints.get(vaultId);
  }

  public saveFingerprint(record: FingerprintModel): void {
    this.fingerprints.set(record.vaultId, record);
  }

  // DNA operations
  public getDna(vaultId: string): DnaModel | undefined {
    return this.dnaRecords.get(vaultId);
  }

  public saveDna(record: DnaModel): void {
    this.dnaRecords.set(record.vaultId, record);
  }

  // Access audit logs
  public logAccess(log: AccessLogModel): void {
    this.accessLogs.unshift(log);
  }

  public getAccessLogs(vaultId?: string): AccessLogModel[] {
    if (!vaultId) return this.accessLogs;
    return this.accessLogs.filter((l) => l.vaultId === vaultId);
  }

  // Medical records operations
  public getRecords(vaultId: string): MedicalRecordModel[] {
    return this.medicalRecords.get(vaultId) || [];
  }

  public saveRecord(record: MedicalRecordModel): void {
    const list = this.medicalRecords.get(record.vaultId) || [];
    list.unshift(record);
    this.medicalRecords.set(record.vaultId, list);
  }
}

export const db = new DatabaseStore();
