import {
  PatientPersona, MedicalRecord, Consent, AuditLog, Hospital,
  CheckupReminder, SystemStats, IncomingAccessRequest, IntegrityResult, RecordCategory
} from './types';
import {
  INITIAL_PERSONAS, INITIAL_RECORDS, INITIAL_HOSPITALS,
  INITIAL_CONSENTS, INITIAL_AUDIT_LOGS, INITIAL_REMINDERS,
  INITIAL_REQUESTS, INITIAL_STATS
} from './seedData';

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

  getPatientById: async (mediIdOrId: string): Promise<PatientPersona | null> => {
    await delay(500);
    const personas: PatientPersona[] = JSON.parse(localStorage.getItem(KEYS.PERSONAS) || '[]');
    const cleanQuery = mediIdOrId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    const match = personas.find(
      (p) =>
        p.id.toLowerCase() === cleanQuery ||
        p.mediId.replace(/-/g, '').toLowerCase().includes(cleanQuery.replace(/-/g, '')) ||
        p.mediId.toLowerCase() === cleanQuery
    );
    return match || personas[0]; // fallback for demo if query entered
  },

  // Records Management
  getRecords: async (category?: RecordCategory | 'All'): Promise<MedicalRecord[]> => {
    await delay(450);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
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
  }): Promise<{ record: MedicalRecord; txHash: string }> => {
    await delay(750);
    const activeId = localStorage.getItem(KEYS.PERSONA_ID) || 'persona-diabetic';
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const txHash = generateTxHash();
    const recordHash = generateHexHash();

    const newRec: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: input.title,
      category: 'Self-declared',
      recordType: input.recordType,
      source: 'Patient (Self-declared)',
      sourceType: 'self',
      date: new Date().toISOString().split('T')[0],
      txHash,
      blockNumber: 4820000 + Math.floor(Math.random() * 500),
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
      actor: 'Patient (Self-declared)',
      action: `Added self-declared record: ${input.title}`,
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
    input: { title: string; recordType: string; doctorName: string; summary: string; details: Record<string, string> }
  ): Promise<{ record: MedicalRecord; txHash: string }> => {
    await delay(800);
    const recordsMap: Record<string, MedicalRecord[]> = JSON.parse(
      localStorage.getItem(KEYS.RECORDS) || '{}'
    );
    const txHash = generateTxHash();
    const signatureHash = generateHexHash();
    const recordHash = generateHexHash();

    const newRec: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: input.title,
      category: 'Hospital-verified',
      recordType: input.recordType,
      source: hospitalName,
      sourceType: 'hospital',
      date: new Date().toISOString().split('T')[0],
      doctor: input.doctorName,
      txHash,
      blockNumber: 4820100 + Math.floor(Math.random() * 500),
      version: 1,
      status: 'verified',
      payload: {
        summary: input.summary,
        details: input.details,
        signedBy: `${hospitalName} Medical Registrar`,
        signatureHash
      },
      hash: recordHash
    };

    if (!recordsMap[patientId]) recordsMap[patientId] = [];
    recordsMap[patientId].unshift(newRec);
    localStorage.setItem(KEYS.RECORDS, JSON.stringify(recordsMap));

    // Audit log
    const auditLogs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    auditLogs.unshift({
      id: `aud-${Date.now()}`,
      eventType: 'Record Added',
      actor: `${hospitalName} (${input.doctorName})`,
      action: `Anchored hospital-verified record: ${input.title}`,
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
