import {
  PatientPersona, MedicalRecord, Consent, AuditLog, Hospital,
  CheckupReminder, SystemStats, IncomingAccessRequest, IntegrityResult, RecordCategory
} from './types';
import {
  INITIAL_PERSONAS, INITIAL_RECORDS, INITIAL_HOSPITALS,
  INITIAL_CONSENTS, INITIAL_AUDIT_LOGS, INITIAL_REMINDERS,
  INITIAL_REQUESTS, INITIAL_STATS
} from './seedData';
import { generateMediID, hashMediID } from '../lib/mediId';
import { generateVaultId } from '../lib/crypto';

// Storage keys
const KEYS = {
  PERSONA_ID: 'medivault_active_persona_id',
  PERSONAS: 'medivault_personas',
  RECORDS: 'medivault_records',
  CONSENTS: 'medivault_consents',
  AUDIT_LOGS: 'medivault_audit_logs',
  HOSPITALS: 'medivault_hospitals',
  REMINDERS: 'medivault_reminders',
  REQUESTS: 'medivault_requests',
  TAMPERED_MAP: 'medivault_tampered_records'
};

const delay = (customMs?: number) => {
  const ms = customMs ?? (Math.floor(Math.random() * 600) + 300);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const generateTxHash = () => {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += hex[Math.floor(Math.random() * 16)];
  }
  return hash;
};

const generateHexHash = () => {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 40; i++) {
    hash += hex[Math.floor(Math.random() * 16)];
  }
  return hash;
};

// Initializer
function initStorage() {
  if (!localStorage.getItem(KEYS.PERSONA_ID)) {
    localStorage.setItem(KEYS.PERSONA_ID, 'persona-diabetic');
  }
  if (!localStorage.getItem(KEYS.PERSONAS)) {
    localStorage.setItem(KEYS.PERSONAS, JSON.stringify(INITIAL_PERSONAS));
  }
  if (!localStorage.getItem(KEYS.RECORDS)) {
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
  }
  if (!localStorage.getItem(KEYS.CONSENTS)) {
    localStorage.setItem(KEYS.CONSENTS, JSON.stringify(INITIAL_CONSENTS));
  }
  if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  }
  if (!localStorage.getItem(KEYS.HOSPITALS)) {
    localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
  }
  if (!localStorage.getItem(KEYS.REMINDERS)) {
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(INITIAL_REMINDERS));
  }
  if (!localStorage.getItem(KEYS.REQUESTS)) {
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
  }
}

initStorage();

export const mockApi = {
  // Persona Management
  getActivePersonaId: async (): Promise<string> => {
    return localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
  },

  setActivePersonaId: async (id: string): Promise<PatientPersona> => {
    await delay(200);
    localStorage.setItem(KEYS.PERSONA_ID, id);
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    const found = personas.find((p) => p.id === id) || personas[0];
    return found;
  },

  getPersonas: async (): Promise<PatientPersona[]> => {
    await delay(200);
    return JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
  },

  getCurrentPatient: async (): Promise<PatientPersona> => {
    await delay(350);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    return personas.find((p) => p.id === activeId) || personas[0];
  },

  registerNewPatient: async (input: {
    name: string;
    dob: string;
    gender?: string;
    phone?: string;
    email?: string;
    bloodGroup?: string;
    allergies?: string[];
    conditions?: string[];
    emergencyContact?: { name: string; relation: string; phone: string };
    dnaReferenceId?: string;
    issuingLaboratory?: string;
    biometricTemplate?: any;
    biometricCredentialId?: string;
    biometricRegistered?: boolean;
    sensorType?: string;
    registeredBy?: 'patient' | 'hospital';
    actorName?: string;
  }): Promise<{ persona: PatientPersona; vaultId: string; mediId: string; txHash: string }> => {
    await delay(500);

    let vaultId = '';
    let mediId = '';
    let mediIdHash = '';
    let dnaHash = '0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8fa1b2c3d4e5f6a7b8c9d0e1f2';
    let biometricHash = '0x9924e930f370ba054a37f5519ea818987ec347adcdcf783c675c97ea8a46b6eb';
    let txHash = generateTxHash();

    // 1. Call backend API to create Vault and Luhn-valid MediID
    try {
      const regRes = await fetch('/api/identity/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          dob: input.dob,
          gender: input.gender || 'Other',
          phone: input.phone || '+91 98765 43210',
          email: input.email || `${input.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          bloodGroup: input.bloodGroup || 'O+',
          allergies: input.allergies || [],
          conditions: input.conditions || [],
          emergencyContact: input.emergencyContact || {
            name: 'Primary Contact',
            relation: 'Family',
            phone: input.phone || '+91 98765 00000'
          },
          requesterId: input.registeredBy === 'hospital' ? 'HOSPITAL_TRIAGE' : 'SYS_PATIENT_ONBOARDING',
          requesterName: input.actorName || (input.registeredBy === 'hospital' ? 'Hospital Triage Desk' : 'Patient Self-Registration')
        })
      });

      if (regRes.ok) {
        const regData = await regRes.json();
        vaultId = regData.vaultId;
        mediId = regData.mediId;
        mediIdHash = regData.mediIdHash;

        // 2. Register Biometrics on backend (AES-256-GCM + SHA-256)
        try {
          const bioRes = await fetch('/api/identity/fingerprint/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vaultId,
              passkeyCredentialId: input.biometricCredentialId,
              sensorType: input.sensorType || 'WebAuthn-Enclave-FIDO2',
              biometricTemplate: input.biometricTemplate
            })
          });
          if (bioRes.ok) {
            const bioData = await bioRes.json();
            if (bioData.biometricHash) biometricHash = bioData.biometricHash;
          }
        } catch {
          // offline fallback
        }

        // 3. Register DNA Reference on backend (AES-256-GCM + SHA-256)
        try {
          const labRef = input.dnaReferenceId || `DNA-LAB-${Math.floor(100000 + Math.random() * 900000)}`;
          const dnaRes = await fetch('/api/identity/dna/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vaultId,
              labReferenceId: labRef,
              issuingLaboratory: input.issuingLaboratory || 'National Genomics Center (NABL)'
            })
          });
          if (dnaRes.ok) {
            const dnaData = await dnaRes.json();
            if (dnaData.dnaHash) dnaHash = dnaData.dnaHash;
          }
        } catch {
          // offline fallback
        }
      }
    } catch {
      // offline fallback
    }

    // Mathematical Luhn fallback if backend offline
    if (!vaultId) vaultId = generateVaultId();
    if (!mediId) mediId = generateMediID();
    if (!mediIdHash) mediIdHash = hashMediID(mediId);

    const personaId = `persona-${vaultId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8)}`;

    const newPersona: PatientPersona = {
      id: personaId,
      name: input.name,
      mediId,
      vaultId,
      dob: input.dob,
      gender: input.gender || 'Other',
      phone: input.phone || '+91 98765 43210',
      email: input.email || `${input.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      dnaSaltedHash: dnaHash,
      emergencyInfo: {
        bloodGroup: input.bloodGroup || 'O+',
        allergies: input.allergies || [],
        conditions: input.conditions || [],
        medications: [],
        emergencyContact: input.emergencyContact || {
          name: 'Primary Contact',
          relation: 'Family',
          phone: input.phone || '+91 98765 00000'
        }
      },
      verifiedRecordCount: input.registeredBy === 'hospital' ? 1 : 0,
      activeConsentCount: input.registeredBy === 'hospital' ? 1 : 0,
      lastAccessTime: 'Just now',
      biometricRegistered: input.biometricRegistered !== false,
      biometricCredentialId: input.biometricCredentialId,
      biometricEnrolledAt: new Date().toISOString()
    };

    // Save to personas list in localStorage
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    personas.unshift(newPersona);
    localStorage.setItem(KEYS.PERSONAS, JSON.stringify(personas));

    // Set as active persona
    localStorage.setItem(KEYS.PERSONA_ID, newPersona.id);

    // Initialize records list for new persona
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    recordsMap[newPersona.id] = [];

    // If registered by hospital, add initial verified intake record and consent
    if (input.registeredBy === 'hospital') {
      const actor = input.actorName || 'City General Hospital';
      const intakeRec: MedicalRecord = {
        id: `rec-${Date.now()}`,
        title: 'Triage Intake & Admission Assessment',
        category: 'Hospital-verified',
        recordType: 'Admission Note',
        source: actor,
        sourceType: 'hospital',
        date: new Date().toISOString().split('T')[0],
        doctor: 'Dr. Triage Registrar',
        txHash,
        blockNumber: 4820100 + Math.floor(Math.random() * 200),
        version: 1,
        status: 'verified',
        payload: {
          summary: 'Patient enrolled at hospital triage desk. Baseline emergency profile and vitals anchored.',
          details: {
            'Blood Group Verified': newPersona.emergencyInfo.bloodGroup,
            'Triage Urgency': 'Standard Clinical Triage',
            'Enrolled By': actor
          },
          signedBy: `${actor} Medical Registrar`,
          signatureHash: generateHexHash()
        },
        hash: generateHexHash()
      };
      recordsMap[newPersona.id].push(intakeRec);

      // Add active consent for 24 hours
      const consents: Consent[] = JSON.parse(localStorage.getItem(KEYS.CONSENTS) || '[]');
      consents.unshift({
        id: `cons-${Date.now()}`,
        hospitalId: 'hosp-01',
        hospitalName: actor,
        tier: 'Tier 2',
        tierLabel: 'Full Clinical History Access',
        grantedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        status: 'active',
        txHash,
        reason: 'Hospital Triage Registration & Clinical Admission'
      });
      localStorage.setItem(KEYS.CONSENTS, JSON.stringify(consents));
    }

    localStorage.setItem(KEYS.RECORDS, JSON.stringify(recordsMap));

    // Audit log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Record Added',
      actor: input.actorName || (input.registeredBy === 'hospital' ? 'City General Hospital Triage' : 'Patient Self-Registration'),
      action: `Created new patient identity record: ${newPersona.name} (MediID: ${mediId}, Vault: ${vaultId})`,
      timestamp: 'Just now',
      txHash,
      blockNumber: 4820100 + Math.floor(Math.random() * 200),
      isEmergency: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return { persona: newPersona, vaultId, mediId, txHash };
  },

  getPatientById: async (mediIdOrId: string): Promise<PatientPersona | null> => {
    await delay(350);
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    const cleanQuery = mediIdOrId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    const match = personas.find(
      (p) =>
        p.id.toLowerCase() === cleanQuery ||
        (p.vaultId && p.vaultId.toLowerCase() === cleanQuery) ||
        p.mediId.replace(/-/g, '').toLowerCase().includes(cleanQuery.replace(/-/g, '')) ||
        p.mediId.toLowerCase() === cleanQuery
    );
    if (match) return match;

    // Check if the query is a valid Luhn MediID or vaultId in backend
    try {
      const res = await fetch(`/api/identity/${cleanQuery.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.vault) {
          const v = data.vault;
          const newP: PatientPersona = {
            id: `persona-${v.vaultId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-8)}`,
            name: v.name,
            mediId: v.mediId,
            vaultId: v.vaultId,
            dob: v.dob,
            gender: 'Unspecified',
            phone: v.phoneMasked || '+91 98*** **000',
            email: `${v.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            emergencyInfo: {
              bloodGroup: v.bloodGroup,
              allergies: v.allergies,
              conditions: v.conditions,
              medications: [],
              emergencyContact: v.emergencyContact
            },
            verifiedRecordCount: 0,
            activeConsentCount: 0,
            lastAccessTime: 'Just now'
          };
          personas.push(newP);
          localStorage.setItem(KEYS.PERSONAS, JSON.stringify(personas));
          return newP;
        }
      }
    } catch {
      // offline fallback
    }

    return null;
  },

  // Records Management
  getRecords: async (category?: RecordCategory | 'All', patientId?: string): Promise<MedicalRecord[]> => {
    await delay(350);
    const activeId = patientId || localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const list = recordsMap[activeId] || [];
    if (!category || category === 'All') return list;
    return list.filter((r) => r.category === category);
  },

  addSelfDeclaredRecord: async (input: {
    title: string;
    recordType: string;
    summary: string;
    details: Record<string, string>;
    category?: RecordCategory;
  }): Promise<{ record: MedicalRecord; txHash: string }> => {
    await delay(600);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    const currentPersona = personas.find((p) => p.id === activeId) || personas[0];
    const vaultId = currentPersona?.vaultId || 'VLT-8F29A31B72C1';

    let txHash = generateTxHash();
    let recordHash = generateHexHash();
    let blockNumber = 4820000 + Math.floor(Math.random() * 500);

    // Call backend endpoint to perform authenticated AES-256-GCM encryption & SHA-256 hash
    try {
      const res = await fetch('/api/records/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId,
          title: input.title,
          category: input.category || 'Self-declared',
          recordType: input.recordType,
          source: 'Patient (Self-declared)',
          sourceType: 'self',
          summary: input.summary,
          details: input.details
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          txHash = data.record.txHash || txHash;
          recordHash = data.record.recordHash || recordHash;
          blockNumber = data.record.blockNumber || blockNumber;
        }
      }
    } catch {
      // offline fallback
    }

    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );

    const newRec: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: input.title,
      category: input.category || 'Self-declared',
      recordType: input.recordType,
      source: 'Patient (Self-declared)',
      sourceType: 'self',
      date: new Date().toISOString().split('T')[0],
      txHash,
      blockNumber,
      version: 1,
      status: 'self-declared',
      payload: {
        summary: input.summary,
        details: input.details
      },
      hash: recordHash
    };

    if (!recordsMap[activeId]) recordsMap[activeId] = [];
    recordsMap[activeId].unshift(newRec);
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(recordsMap));

    // Audit log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Record Added',
      actor: `${currentPersona?.name || 'Patient'} (Self-declared)`,
      action: `Anchored self-declared medical record: ${input.title} (AES-256-GCM encrypted)`,
      timestamp: 'Just now',
      txHash,
      blockNumber: newRec.blockNumber,
      isEmergency: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return { record: newRec, txHash };
  },

  addHospitalRecord: async (
    patientId: string,
    hospitalName: string,
    input: {
      title: string;
      recordType: string;
      doctorName: string;
      summary: string;
      details: Record<string, string>;
      category?: RecordCategory;
    }
  ): Promise<{ record: MedicalRecord; txHash: string }> => {
    await delay(700);
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    const patient = personas.find((p) => p.id === patientId || p.mediId === patientId || p.vaultId === patientId);
    const vaultId = patient?.vaultId || 'VLT-8F29A31B72C1';

    let txHash = generateTxHash();
    let signatureHash = generateHexHash();
    let recordHash = generateHexHash();
    let blockNumber = 4820100 + Math.floor(Math.random() * 500);

    // Call backend endpoint to perform authenticated AES-256-GCM encryption & SHA-256 hash
    try {
      const res = await fetch('/api/records/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId,
          title: input.title,
          category: input.category || 'Hospital-verified',
          recordType: input.recordType,
          source: hospitalName,
          sourceType: 'hospital',
          doctor: input.doctorName,
          summary: input.summary,
          details: input.details
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.record) {
          txHash = data.record.txHash || txHash;
          recordHash = data.record.recordHash || recordHash;
          blockNumber = data.record.blockNumber || blockNumber;
        }
      }
    } catch {
      // offline fallback
    }

    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );

    const newRec: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: input.title,
      category: input.category || 'Hospital-verified',
      recordType: input.recordType,
      source: hospitalName,
      sourceType: 'hospital',
      date: new Date().toISOString().split('T')[0],
      doctor: input.doctorName,
      txHash,
      blockNumber,
      version: 1,
      status: 'verified',
      payload: {
        summary: input.summary,
        details: input.details,
        signedBy: `${hospitalName} (${input.doctorName})`,
        signatureHash
      },
      hash: recordHash
    };

    const targetKey = patient ? patient.id : patientId;
    if (!recordsMap[targetKey]) recordsMap[targetKey] = [];
    recordsMap[targetKey].unshift(newRec);
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(recordsMap));

    // Update verified record count on persona
    if (patient) {
      patient.verifiedRecordCount = (patient.verifiedRecordCount || 0) + 1;
      localStorage.setItem(KEYS.PERSONAS, JSON.stringify(personas));
    }

    // Audit log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Record Added',
      actor: `${hospitalName} (${input.doctorName})`,
      action: `Anchored hospital-verified record: ${input.title} (AES-256-GCM encrypted)`,
      timestamp: 'Just now',
      txHash,
      blockNumber: newRec.blockNumber,
      isEmergency: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return { record: newRec, txHash };
  },

  // Integrity Check Simulation
  verifyRecordIntegrity: async (recordId: string): Promise<IntegrityResult> => {
    await delay(1200); // 1.2s computation simulation
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const list = recordsMap[activeId] || [];
    const record = list.find((r) => r.id === recordId);

    if (!record) {
      throw new Error('Record not found');
    }

    const isTampered = record.status === 'tampered' || Boolean(record.tamperedHash);
    const computedHash = isTampered
      ? record.tamperedHash || '0x9999999999999999999999999999999999999999'
      : record.hash;

    return {
      recordId: record.id,
      title: record.title,
      status: isTampered ? 'tampered' : 'verified',
      expectedHash: record.hash,
      computedHash,
      timestamp: new Date().toISOString()
    };
  },

  runFullIntegrityScan: async (): Promise<IntegrityResult[]> => {
    await delay(1800);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const list = recordsMap[activeId] || [];

    const results: IntegrityResult[] = list.map((record) => {
      const isTampered = record.status === 'tampered' || Boolean(record.tamperedHash);
      return {
        recordId: record.id,
        title: record.title,
        status: isTampered ? 'tampered' : 'verified',
        expectedHash: record.hash,
        computedHash: isTampered
          ? record.tamperedHash || '0xbad0bad0bad0bad0bad0bad0bad0bad0bad0bad0'
          : record.hash,
        timestamp: new Date().toISOString()
      };
    });

    // Log full audit scan
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    const tamperedCount = results.filter((r) => r.status === 'tampered').length;
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Integrity Check',
      actor: 'Automated Audit Daemon',
      action: `Ran cryptographic checksum scan on ${results.length} records: ${results.length - tamperedCount} Verified, ${tamperedCount} Tampered`,
      timestamp: 'Just now',
      txHash: generateTxHash(),
      blockNumber: 4820250,
      isEmergency: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return results;
  },

  tamperRecordDemo: async (recordId?: string): Promise<{ recordId: string; title: string }> => {
    await delay(300);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const list = recordsMap[activeId] || [];
    if (list.length === 0) throw new Error('No records available to tamper');

    const target = recordId ? list.find((r) => r.id === recordId) || list[0] : list[0];
    target.status = 'tampered';
    target.tamperedHash = '0xbadcafe999999999999999999999999999999999';

    localStorage.setItem(KEYS.RECORDS, JSON.stringify(recordsMap));
    return { recordId: target.id, title: target.title };
  },

  // Consents
  getConsents: async (): Promise<Consent[]> => {
    await delay(350);
    return JSON.parse(localStorage.getItem(KEYS.CONSENTS) || '[]');
  },

  grantConsent: async (input: {
    hospitalId: string;
    hospitalName: string;
    tier: 'Tier 1' | 'Tier 2';
    durationHours: number;
    reason: string;
  }): Promise<{ consent: Consent; txHash: string }> => {
    await delay(700);
    const consents: Consent[] = JSON.parse(localStorage.getItem(KEYS.CONSENTS) || '[]');
    const txHash = generateTxHash();
    const expiresAt = new Date(Date.now() + input.durationHours * 3600 * 1000).toISOString();

    const newConsent: Consent = {
      id: `cons-${Date.now()}`,
      hospitalId: input.hospitalId,
      hospitalName: input.hospitalName,
      tier: input.tier,
      tierLabel: input.tier === 'Tier 1' ? 'Emergency Profile Only' : 'Full Clinical History Access',
      grantedAt: new Date().toISOString(),
      expiresAt,
      status: 'active',
      txHash,
      reason: input.reason
    };

    consents.unshift(newConsent);
    localStorage.setItem(KEYS.CONSENTS, JSON.stringify(consents));

    // Remove from incoming requests if match
    const requests: IncomingAccessRequest[] = JSON.parse(
      localStorage.getItem(KEYS.REQUESTS) || '[]'
    );
    const filteredRequests = requests.filter((r) => r.hospitalId !== input.hospitalId);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(filteredRequests));

    // Audit log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Consent Granted',
      actor: 'Patient (Self)',
      action: `Granted ${input.tier} access to ${input.hospitalName} for ${input.durationHours}h`,
      timestamp: 'Just now',
      txHash,
      blockNumber: 4820310,
      isEmergency: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return { consent: newConsent, txHash };
  },

  revokeConsent: async (consentId: string): Promise<{ txHash: string }> => {
    await delay(500);
    const consents: Consent[] = JSON.parse(localStorage.getItem(KEYS.CONSENTS) || '[]');
    const consent = consents.find((c) => c.id === consentId);
    if (consent) {
      consent.status = 'revoked';
      localStorage.setItem(KEYS.CONSENTS, JSON.stringify(consents));

      const txHash = generateTxHash();
      const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
      auditLogs.unshift({
        id: `aud-${Date.now()}`,
        eventType: 'Consent Revoked',
        actor: 'Patient (Self)',
        action: `Revoked ${consent.tier} access for ${consent.hospitalName} ahead of expiry`,
        timestamp: 'Just now',
        txHash,
        blockNumber: 4820350,
        isEmergency: false
      });
      localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
      return { txHash };
    }
    return { txHash: generateTxHash() };
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    await delay(400);
    return JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
  },

  flagAuditLog: async (auditId: string, reason: string): Promise<void> => {
    await delay(450);
    const logs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    const target = logs.find((l) => l.id === auditId);
    if (target) {
      target.isFlagged = true;
      target.flagReason = reason;
      localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
    }
  },

  // Incoming Requests
  getIncomingRequests: async (): Promise<IncomingAccessRequest[]> => {
    await delay(300);
    return JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
  },

  // Hospitals
  getHospitals: async (): Promise<Hospital[]> => {
    await delay(350);
    return JSON.parse(localStorage.getItem(KEYS.HOSPITALS) || '[]');
  },

  addHospital: async (input: { name: string; walletAddress: string }): Promise<Hospital> => {
    await delay(600);
    const hospitals: Hospital[] = JSON.parse(localStorage.getItem(KEYS.HOSPITALS) || '[]');
    const newHosp: Hospital = {
      id: `hosp-${Date.now()}`,
      name: input.name,
      walletAddress: input.walletAddress,
      status: 'Approved',
      trustScore: 100.0,
      emergencyAccessCount: 0,
      registeredAt: new Date().toISOString().split('T')[0]
    };
    hospitals.unshift(newHosp);
    localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(hospitals));
    return newHosp;
  },

  removeHospital: async (id: string): Promise<void> => {
    await delay(500);
    const hospitals: Hospital[] = JSON.parse(localStorage.getItem(KEYS.HOSPITALS) || '[]');
    const filtered = hospitals.filter((h) => h.id !== id);
    localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(filtered));
  },

  // Emergency Break Glass
  triggerEmergencyBreakGlass: async (
    hospitalId: string,
    hospitalName: string,
    reasonCategory: string,
    notes: string
  ): Promise<{ txHash: string }> => {
    await delay(800);
    const txHash = generateTxHash();

    // Increment emergency count for hospital
    const hospitals: Hospital[] = JSON.parse(localStorage.getItem(KEYS.HOSPITALS) || '[]');
    const hosp = hospitals.find((h) => h.id === hospitalId || h.name === hospitalName);
    if (hosp) {
      hosp.emergencyAccessCount += 1;
      localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(hospitals));
    }

    // Add Emergency Audit Log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Emergency Access',
      actor: `${hospitalName} Emergency Triage`,
      action: `BREAK-GLASS invoked (Category: ${reasonCategory} - ${notes})`,
      timestamp: 'Just now',
      txHash,
      blockNumber: 4820400,
      isEmergency: true,
      isFlagged: false
    });
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));

    return { txHash };
  },

  // Reminders & System Stats
  getReminders: async (): Promise<CheckupReminder[]> => {
    await delay(300);
    return JSON.parse(localStorage.getItem(KEYS.REMINDERS) || '[]');
  },

  fastForwardReminders: async (days: number = 30): Promise<CheckupReminder[]> => {
    await delay(400);
    const reminders: CheckupReminder[] = JSON.parse(
      localStorage.getItem(KEYS.REMINDERS) || '[]'
    );
    const updated = reminders.map((rem) => {
      const remaining = rem.daysRemaining - days;
      let state: 'due' | 'overdue' | 'done' = rem.dueState;
      let label = rem.dueStateLabel;

      if (remaining < 0 && rem.dueState !== 'done') {
        state = 'overdue';
        label = `Overdue by ${Math.abs(remaining)} days`;
      } else if (remaining >= 0 && rem.dueState !== 'done') {
        state = 'due';
        label = `Due in ${remaining} days`;
      }

      return {
        ...rem,
        daysRemaining: remaining,
        dueState: state,
        dueStateLabel: label
      };
    });

    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(updated));
    return updated;
  },

  getSystemStats: async (): Promise<SystemStats> => {
    await delay(400);
    return INITIAL_STATS;
  },

  // Demo Helpers
  triggerIncomingRequestDemo: async (): Promise<IncomingAccessRequest> => {
    await delay(300);
    const requests: IncomingAccessRequest[] = JSON.parse(
      localStorage.getItem(KEYS.REQUESTS) || '[]'
    );
    const newReq: IncomingAccessRequest = {
      id: `req-${Date.now()}`,
      hospitalId: 'hosp-02',
      hospitalName: 'Sunrise Hospital ER',
      reason: 'Urgent cardiology evaluation and trauma history review.',
      requestedTier: 'Tier 2',
      requestedAt: 'Just now'
    };
    requests.unshift(newReq);
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
    return newReq;
  },

  resetDemoData: async (): Promise<void> => {
    await delay(400);
    localStorage.setItem(KEYS.PERSONA_ID, 'persona-diabetic');
    localStorage.setItem(KEYS.PERSONAS, JSON.stringify(INITIAL_PERSONAS));
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(INITIAL_RECORDS));
    localStorage.setItem(KEYS.CONSENTS, JSON.stringify(INITIAL_CONSENTS));
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    localStorage.setItem(KEYS.HOSPITALS, JSON.stringify(INITIAL_HOSPITALS));
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(INITIAL_REMINDERS));
    localStorage.setItem(KEYS.REQUESTS, JSON.stringify(INITIAL_REQUESTS));
  }
};
