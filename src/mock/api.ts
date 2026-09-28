import {
  PatientPersona, MedicalRecord, Consent, AuditLog, Hospital,
  CheckupReminder, SystemStats, IncomingAccessRequest, IntegrityResult, RecordCategory,
  Session, LoginMethod, LoginRequest, BiometricCredential, NewPatientInput
} from './types';
import {
  INITIAL_PERSONAS, INITIAL_RECORDS, INITIAL_HOSPITALS,
  INITIAL_CONSENTS, INITIAL_AUDIT_LOGS, INITIAL_REMINDERS,
  INITIAL_REQUESTS, INITIAL_STATS
} from './seedData';
import { generateMediID, hashMediID } from '../lib/mediId';
import { generateVaultId } from '../lib/crypto';

// Storage keys. Nothing is seeded automatically: the Login page's "Load test data" button
// calls loadTestData(). Consents, audit logs, reminders and requests are stored per patient
// ({ [personaId]: T[] }) so each user's wallet only ever sees its own data.
const KEYS = {
  TEST_DATA_LOADED: 'medivault2_test_data_loaded',
  SESSION: 'medivault2_session',
  PERSONAS: 'medivault2_personas',
  RECORDS: 'medivault2_records',
  CONSENTS: 'medivault2_consents',
  AUDIT_LOGS: 'medivault2_audit_logs',
  HOSPITALS: 'medivault2_hospitals',
  REMINDERS: 'medivault2_reminders',
  REQUESTS: 'medivault2_requests',
  BIOMETRICS: 'medivault2_biometrics',
  LOGIN_REQUESTS: 'medivault2_login_requests'
};

export const LOGIN_REQUESTS_STORAGE_KEY = KEYS.LOGIN_REQUESTS;
export const LOGIN_REQUEST_TTL_MS = 2 * 60 * 1000;

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

// Deterministic mock wallet address derived from a seed (persona id / credential id).
const deriveWalletAddress = (seed: string) => {
  let out = '';
  let h = 0x811c9dc5;
  for (let round = 0; out.length < 40; round++) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i) + round;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, '0');
  }
  return '0x' + out.slice(0, 40);
};

const generateMediId = () => {
  const block = () => String(Math.floor(1000 + Math.random() * 9000));
  return `91-${block()}-${block()}-${block()}`;
};

const describeDevice = () => {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown OS';
  return `${browser} on ${os}`;
};

const isExpired = (req: LoginRequest) => Date.parse(req.expiresAt) < Date.now();

// Storage helpers
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentPersonaId(): string | null {
  return read<Session | null>(KEYS.SESSION, null)?.personaId ?? null;
}

function readScoped<T>(key: string, personaId: string | null = currentPersonaId()): T[] {
  if (!personaId) return [];
  return read<Record<string, T[]>>(key, {})[personaId] ?? [];
}

function writeScoped<T>(key: string, list: T[], personaId: string | null = currentPersonaId()) {
  if (!personaId) return;
  const map = read<Record<string, T[]>>(key, {});
  map[personaId] = list;
  write(key, map);
}

function requireSession(): string {
  const id = currentPersonaId();
  if (!id) throw new Error('Not logged in');
  return id;
}

const normaliseMediId = (id: string) => id.replace(/\D/g, '');

function logAccess(personaId: string, action: string) {
  const logs = readScoped<AuditLog>(KEYS.AUDIT_LOGS, personaId);
  logs.unshift({
    id: `aud-${Date.now()}`,
    eventType: 'Access',
    actor: 'Patient (Self)',
    action,
    timestamp: 'Just now',
    txHash: generateTxHash(),
    blockNumber: 4820500 + Math.floor(Math.random() * 100),
    isEmergency: false
  });
  writeScoped(KEYS.AUDIT_LOGS, logs, personaId);
}

// Test data: seed patients (with wallets), their data, and simulated fingerprints.
export const TEST_FINGERPRINTS: { credentialId: string; personaId: string; label: string }[] = [
  { credentialId: 'sim-right-thumb', personaId: 'persona-diabetic', label: 'Right thumb' },
  { credentialId: 'sim-left-thumb', personaId: 'persona-healthy', label: 'Left thumb' },
  { credentialId: 'sim-right-index', personaId: 'persona-hypertensive', label: 'Right index' }
];

// overwrite=false keeps user-created patients and fingerprints; true is a full reset.
function writeTestData(overwrite: boolean) {
  const seedPersonas = INITIAL_PERSONAS.map((p) => ({ ...p, walletAddress: deriveWalletAddress(p.id) }));
  const seedIds = new Set(seedPersonas.map((p) => p.id));
  const createdPersonas = overwrite ? [] : readPersonas().filter((p) => !seedIds.has(p.id));
  write(KEYS.PERSONAS, [...seedPersonas, ...createdPersonas]);

  const scopedSeed = (primary: unknown[]) => ({ 'persona-diabetic': primary, 'persona-healthy': [], 'persona-hypertensive': [] });
  const merge = (key: string, seed: Record<string, unknown>) =>
    write(key, { ...(overwrite ? {} : read<Record<string, unknown>>(key, {})), ...seed });

  merge(KEYS.RECORDS, INITIAL_RECORDS);
  merge(KEYS.CONSENTS, scopedSeed(INITIAL_CONSENTS));
  merge(KEYS.AUDIT_LOGS, scopedSeed(INITIAL_AUDIT_LOGS));
  merge(KEYS.REMINDERS, scopedSeed(INITIAL_REMINDERS));
  merge(KEYS.REQUESTS, scopedSeed(INITIAL_REQUESTS));
  write(KEYS.HOSPITALS, INITIAL_HOSPITALS);

  const seedPrints: BiometricCredential[] = TEST_FINGERPRINTS.map((f) => ({
    ...f,
    kind: 'simulated',
    createdAt: new Date().toISOString()
  }));
  const seedPrintIds = new Set(seedPrints.map((f) => f.credentialId));
  const createdPrints = overwrite
    ? []
    : read<BiometricCredential[]>(KEYS.BIOMETRICS, []).filter((b) => !seedPrintIds.has(b.credentialId));
  write(KEYS.BIOMETRICS, [...seedPrints, ...createdPrints]);

  write(KEYS.TEST_DATA_LOADED, true);

  // A full reset drops created users, so end any session that pointed at one.
  const sessionId = currentPersonaId();
  if (sessionId && !readPersonas().some((p) => p.id === sessionId)) localStorage.removeItem(KEYS.SESSION);
}

function readPersonas(): PatientPersona[] {
  return read<PatientPersona[]>(KEYS.PERSONAS, []);
}

function startSession(personaId: string, method: LoginMethod): PatientPersona {
  const persona = readPersonas().find((p) => p.id === personaId);
  if (!persona) throw new Error('Patient vault not found');
  const session: Session = { personaId, method, loggedInAt: new Date().toISOString() };
  write(KEYS.SESSION, session);
  return persona;
}

export const mockApi = {
  // Test data
  hasTestData: (): boolean => read<boolean>(KEYS.TEST_DATA_LOADED, false),

  loadTestData: async (): Promise<void> => {
    await delay(600);
    writeTestData(false);
  },

  // Session
  getSession: (): Session | null => read<Session | null>(KEYS.SESSION, null),

  logout: async (): Promise<void> => {
    localStorage.removeItem(KEYS.SESSION);
  },

  // Biometric login: a credential id (WebAuthn rawId or simulated finger id) maps to one patient.
  // Returns null for an unknown fingerprint so the UI can offer to create a new user.
  loginWithBiometric: async (credentialId: string): Promise<PatientPersona | null> => {
    await delay(500);
    const match = read<BiometricCredential[]>(KEYS.BIOMETRICS, []).find((b) => b.credentialId === credentialId);
    if (!match || !readPersonas().some((p) => p.id === match.personaId)) return null;
    const persona = startSession(match.personaId, 'biometric');
    logAccess(persona.id, `Vault unlocked with registered fingerprint (${match.label})`);
    return persona;
  },

  // Creates a new patient + wallet, binds the fingerprint to it, and logs in.
  createPatientWithBiometric: async (
    input: NewPatientInput,
    credential: Pick<BiometricCredential, 'credentialId' | 'kind' | 'label'>
  ): Promise<PatientPersona> => {
    await delay(900);
    const prints = read<BiometricCredential[]>(KEYS.BIOMETRICS, []);
    if (prints.some((b) => b.credentialId === credential.credentialId)) {
      throw new Error('This fingerprint is already registered to another vault');
    }

    const id = `persona-${Date.now()}`;
    const persona: PatientPersona = {
      id,
      name: input.name,
      mediId: generateMediId(),
      dob: input.dob,
      gender: input.gender,
      phone: input.phone,
      email: input.email,
      walletAddress: deriveWalletAddress(`${id}:${credential.credentialId}`),
      emergencyInfo: {
        bloodGroup: input.bloodGroup,
        allergies: input.allergies,
        conditions: input.conditions,
        medications: [],
        emergencyContact: { name: '', relation: '', phone: '' }
      },
      verifiedRecordCount: 0,
      activeConsentCount: 0,
      lastAccessTime: 'Just now'
    };

    write(KEYS.PERSONAS, [...readPersonas(), persona]);
    write(KEYS.BIOMETRICS, [...prints, { ...credential, personaId: id, createdAt: new Date().toISOString() }]);
    startSession(id, 'biometric');
    logAccess(id, `Vault and wallet created; fingerprint (${credential.label}) registered as login key`);
    return persona;
  },

  // Login via MediID: a request is sent to the patient's registered device(s) for approval.
  requestLoginById: async (mediId: string): Promise<LoginRequest> => {
    await delay(700);
    const wanted = normaliseMediId(mediId);
    const persona = wanted ? readPersonas().find((p) => normaliseMediId(p.mediId) === wanted) : undefined;
    if (!persona) throw new Error('No vault found for this MediID');

    const now = Date.now();
    const request: LoginRequest = {
      id: `login-${now}`,
      personaId: persona.id,
      patientName: persona.name,
      mediId: persona.mediId,
      code: String(Math.floor(10 + Math.random() * 90)),
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + LOGIN_REQUEST_TTL_MS).toISOString(),
      deviceLabel: describeDevice()
    };
    write(KEYS.LOGIN_REQUESTS, [request, ...read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []).filter((r) => !isExpired(r))]);
    return request;
  },

  getLoginRequest: (requestId: string): LoginRequest | null => {
    const req = read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []).find((r) => r.id === requestId) ?? null;
    return req && req.status === 'pending' && isExpired(req) ? { ...req, status: 'expired' } : req;
  },

  // Pending requests for the logged-in patient (shown on their already-signed-in devices).
  getPendingLoginRequests: (): LoginRequest[] => {
    const id = currentPersonaId();
    if (!id) return [];
    return read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []).filter(
      (r) => r.personaId === id && r.status === 'pending' && !isExpired(r)
    );
  },

  respondToLoginRequest: async (requestId: string, approve: boolean): Promise<void> => {
    const requests = read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []);
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status !== 'pending' || isExpired(req)) return;
    req.status = approve ? 'approved' : 'denied';
    write(KEYS.LOGIN_REQUESTS, requests);
    if (approve) logAccess(req.personaId, `Approved login request from ${req.deviceLabel}`);
  },

  cancelLoginRequest: (requestId: string) => {
    write(KEYS.LOGIN_REQUESTS, read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []).filter((r) => r.id !== requestId));
  },

  // Called by the requesting device once its request is approved; each approval is single-use.
  completeIdLogin: async (requestId: string): Promise<PatientPersona> => {
    const requests = read<LoginRequest[]>(KEYS.LOGIN_REQUESTS, []);
    const req = requests.find((r) => r.id === requestId);
    if (!req || req.status !== 'approved') throw new Error('Login request was not approved');
    write(KEYS.LOGIN_REQUESTS, requests.filter((r) => r.id !== requestId));
    return startSession(req.personaId, 'id-request');
  },

  // Persona Management
  getActivePersonaId: async (): Promise<string> => {
    return currentPersonaId() ?? '';
  },

  // Presenter shortcut (Demo Tools drawer): switches the logged-in patient.
  setActivePersonaId: async (id: string): Promise<PatientPersona> => {
    await delay(200);
    return startSession(id, 'demo');
  },

  getPersonas: async (): Promise<PatientPersona[]> => {
    await delay(200);
    return readPersonas();
  },

  // Null when nobody is logged in, so no patient data is exposed without a session.
  getCurrentPatient: async (): Promise<PatientPersona | null> => {
    await delay(350);
    const activeId = currentPersonaId();
    return (activeId && readPersonas().find((p) => p.id === activeId)) || null;
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
      walletAddress: deriveWalletAddress(personaId),
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
    const personas = readPersonas();
    personas.unshift(newPersona);
    write(KEYS.PERSONAS, personas);

    // If patient self-registered, start session
    if (input.registeredBy !== 'hospital') {
      startSession(newPersona.id, 'biometric');
    }

    // Register biometric credential in local list if provided
    if (input.biometricCredentialId) {
      const prints = read<BiometricCredential[]>(KEYS.BIOMETRICS, []);
      if (!prints.some((b) => b.credentialId === input.biometricCredentialId)) {
        prints.push({
          credentialId: input.biometricCredentialId,
          personaId: newPersona.id,
          kind: input.sensorType?.includes('WebAuthn') ? 'webauthn' : 'simulated',
          label: input.sensorType || 'Primary Biometric Fingerprint',
          createdAt: new Date().toISOString()
        });
        write(KEYS.BIOMETRICS, prints);
      }
    }

    // Initialize records list for new persona
    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});
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
      const consents: Consent[] = readScoped<Consent>(KEYS.CONSENTS, newPersona.id);
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
      writeScoped(KEYS.CONSENTS, consents, newPersona.id);
    }

    write(KEYS.RECORDS, recordsMap);

    // Audit log
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS, newPersona.id);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs, newPersona.id);

    return { persona: newPersona, vaultId, mediId, txHash };
  },

  getPatientById: async (mediIdOrId: string): Promise<PatientPersona | null> => {
    await delay(350);
    const personas = readPersonas();
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
            walletAddress: deriveWalletAddress(v.vaultId),
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
          write(KEYS.PERSONAS, personas);
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
    const activeId = patientId || currentPersonaId() || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});
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
    const activeId = currentPersonaId() || 'persona-diabetic';
    const personas = readPersonas();
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

    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});

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
    write(KEYS.RECORDS, recordsMap);

    // Audit log
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS, activeId);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs, activeId);

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
    const personas = readPersonas();
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

    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});

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
    write(KEYS.RECORDS, recordsMap);

    // Update verified record count on persona
    if (patient) {
      patient.verifiedRecordCount = (patient.verifiedRecordCount || 0) + 1;
      write(KEYS.PERSONAS, personas);
    }

    // Audit log
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS, targetKey);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs, targetKey);

    return { record: newRec, txHash };
  },


  // Integrity Check Simulation
  verifyRecordIntegrity: async (recordId: string): Promise<IntegrityResult> => {
    await delay(1200); // 1.2s computation simulation
    const activeId = currentPersonaId() ?? '';
    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});
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
    const activeId = currentPersonaId() ?? '';
    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});
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
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs);

    return results;
  },

  tamperRecordDemo: async (recordId?: string): Promise<{ recordId: string; title: string }> => {
    await delay(300);
    const activeId = currentPersonaId() ?? '';
    const recordsMap: Record<string, MedicalRecord[]> = read<Record<string, MedicalRecord[]>>(KEYS.RECORDS, {});
    const list = recordsMap[activeId] || [];
    if (list.length === 0) throw new Error('No records available to tamper');

    const target = recordId ? list.find((r) => r.id === recordId) || list[0] : list[0];
    target.status = 'tampered';
    target.tamperedHash = '0xbadcafe999999999999999999999999999999999';

    write(KEYS.RECORDS, recordsMap);
    return { recordId: target.id, title: target.title };
  },

  // Consents
  getConsents: async (): Promise<Consent[]> => {
    await delay(350);
    return readScoped<Consent>(KEYS.CONSENTS);
  },

  grantConsent: async (input: {
    hospitalId: string;
    hospitalName: string;
    tier: 'Tier 1' | 'Tier 2';
    durationHours: number;
    reason: string;
  }): Promise<{ consent: Consent; txHash: string }> => {
    await delay(700);
    const consents: Consent[] = readScoped<Consent>(KEYS.CONSENTS);
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
    writeScoped(KEYS.CONSENTS, consents);

    // Remove from incoming requests if match
    const requests: IncomingAccessRequest[] = readScoped<IncomingAccessRequest>(KEYS.REQUESTS);
    const filteredRequests = requests.filter((r) => r.hospitalId !== input.hospitalId);
    writeScoped(KEYS.REQUESTS, filteredRequests);

    // Audit log
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs);

    return { consent: newConsent, txHash };
  },

  revokeConsent: async (consentId: string): Promise<{ txHash: string }> => {
    await delay(500);
    const consents: Consent[] = readScoped<Consent>(KEYS.CONSENTS);
    const consent = consents.find((c) => c.id === consentId);
    if (consent) {
      consent.status = 'revoked';
      writeScoped(KEYS.CONSENTS, consents);

      const txHash = generateTxHash();
      const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS);
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
      writeScoped(KEYS.AUDIT_LOGS, auditLogs);
      return { txHash };
    }
    return { txHash: generateTxHash() };
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    await delay(400);
    return readScoped<AuditLog>(KEYS.AUDIT_LOGS);
  },

  // Admin view: every patient's audit trail.
  getAllAuditLogs: async (): Promise<AuditLog[]> => {
    await delay(400);
    return Object.values(read<Record<string, AuditLog[]>>(KEYS.AUDIT_LOGS, {})).flat();
  },

  flagAuditLog: async (auditId: string, reason: string): Promise<void> => {
    await delay(450);
    const logs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS);
    const target = logs.find((l) => l.id === auditId);
    if (target) {
      target.isFlagged = true;
      target.flagReason = reason;
      writeScoped(KEYS.AUDIT_LOGS, logs);
    }
  },

  // Incoming Requests
  getIncomingRequests: async (): Promise<IncomingAccessRequest[]> => {
    await delay(300);
    return readScoped<IncomingAccessRequest>(KEYS.REQUESTS);
  },

  // Hospitals
  getHospitals: async (): Promise<Hospital[]> => {
    await delay(350);
    return read<Hospital[]>(KEYS.HOSPITALS, []);
  },

  addHospital: async (input: { name: string; walletAddress: string }): Promise<Hospital> => {
    await delay(600);
    const hospitals: Hospital[] = read<Hospital[]>(KEYS.HOSPITALS, []);
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
    write(KEYS.HOSPITALS, hospitals);
    return newHosp;
  },

  removeHospital: async (id: string): Promise<void> => {
    await delay(500);
    const hospitals: Hospital[] = read<Hospital[]>(KEYS.HOSPITALS, []);
    const filtered = hospitals.filter((h) => h.id !== id);
    write(KEYS.HOSPITALS, filtered);
  },

  // Emergency Break Glass
  triggerEmergencyBreakGlass: async (
    hospitalId: string,
    hospitalName: string,
    reasonCategory: string,
    notes: string,
    patientId: string | null = currentPersonaId()
  ): Promise<{ txHash: string }> => {
    await delay(800);
    const txHash = generateTxHash();

    // Increment emergency count for hospital
    const hospitals: Hospital[] = read<Hospital[]>(KEYS.HOSPITALS, []);
    const hosp = hospitals.find((h) => h.id === hospitalId || h.name === hospitalName);
    if (hosp) {
      hosp.emergencyAccessCount += 1;
      write(KEYS.HOSPITALS, hospitals);
    }

    // Add Emergency Audit Log
    const auditLogs: AuditLog[] = readScoped<AuditLog>(KEYS.AUDIT_LOGS, patientId);
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
    writeScoped(KEYS.AUDIT_LOGS, auditLogs, patientId);

    return { txHash };
  },

  // Reminders & System Stats
  getReminders: async (): Promise<CheckupReminder[]> => {
    await delay(300);
    return readScoped<CheckupReminder>(KEYS.REMINDERS);
  },

  fastForwardReminders: async (days: number = 30): Promise<CheckupReminder[]> => {
    await delay(400);
    const reminders: CheckupReminder[] = readScoped<CheckupReminder>(KEYS.REMINDERS);
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

    writeScoped(KEYS.REMINDERS, updated);
    return updated;
  },

  getSystemStats: async (): Promise<SystemStats> => {
    await delay(400);
    return INITIAL_STATS;
  },

  // Demo Helpers
  triggerIncomingRequestDemo: async (): Promise<IncomingAccessRequest> => {
    await delay(300);
    const requests: IncomingAccessRequest[] = readScoped<IncomingAccessRequest>(KEYS.REQUESTS);
    const newReq: IncomingAccessRequest = {
      id: `req-${Date.now()}`,
      hospitalId: 'hosp-02',
      hospitalName: 'Sunrise Hospital ER',
      reason: 'Urgent cardiology evaluation and trauma history review.',
      requestedTier: 'Tier 2',
      requestedAt: 'Just now'
    };
    requests.unshift(newReq);
    writeScoped(KEYS.REQUESTS, requests);
    return newReq;
  },

  resetDemoData: async (): Promise<void> => {
    await delay(400);
    writeTestData(true);
  }
};
