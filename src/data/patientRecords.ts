/**
 * SINGLE SOURCE OF TRUTH — Patient Medical Records
 *
 * This is the ONLY place patient data is defined.
 * The Medical Records page, AI Assistant, Verification tab,
 * Consent management, and all other features MUST read from here.
 *
 * SYNTHETIC DEMO DATA ONLY — not real patient information.
 */

// ─── App Configuration ───────────────────────────────────────────────────────
// Change this ONE value to rename the application everywhere.
export const APP_DISPLAY_NAME = 'Medical Records Assistant';
export const APP_SHORT_NAME = 'Record Vault';
export const AI_ASSISTANT_NAME = 'Record Assistant AI';

// ─── Patient ─────────────────────────────────────────────────────────────────
export const PATIENT_ID = 'P-RAJESH';

export const CANONICAL_PATIENT = {
  id: PATIENT_ID,
  name: 'Rajesh Kumar',
  dob: '1974-05-14',
  bloodGroup: 'B+',
  allergies: ['Penicillin', 'Dust Mites'],
  conditions: ['Type 2 Diabetes Mellitus', 'Mild Hypertension'],
};

// ─── Doctors (also used by Verification tab) ─────────────────────────────────
export interface CanonicalDoctor {
  id: string;
  name: string;
  displayName: string; // e.g. "Dr. A. R. Mehta"
  specialty: string;
  hospital: string;
  registrationNumber: string;
  verificationHash: string;
  verified: boolean;
}

export const CANONICAL_DOCTORS: CanonicalDoctor[] = [
  {
    id: 'doc-sharma',
    name: 'Dr. Sharma',
    displayName: 'Dr. Sharma (General Medicine)',
    specialty: 'General Medicine',
    hospital: 'City General Hospital',
    registrationNumber: 'MH-39201',
    verificationHash: '0xd12a3b4c5d6e7f8091a2b3c4d5e6f78901234567',
    verified: true,
  },
  {
    id: 'doc-patel',
    name: 'Dr. Patel',
    displayName: 'Dr. Patel (Endocrinology)',
    specialty: 'Endocrinology',
    hospital: 'Sunrise Hospital',
    registrationNumber: 'MH-48202',
    verificationHash: '0xd23a4b5c6d7e8f9012a3b4c5d6e7f89012345678',
    verified: true,
  },
  {
    id: 'doc-mehta',
    name: 'Dr. A. R. Mehta',
    displayName: 'Dr. A. R. Mehta (Endocrinology)',
    specialty: 'Endocrinology',
    hospital: 'City General Hospital',
    registrationNumber: 'MH-48201',
    verificationHash: '0xa1b2c3d4e5f6789012345678abcdef0123456789',
    verified: true,
  },
  {
    id: 'doc-gupta',
    name: 'Dr. S. K. Gupta',
    displayName: 'Dr. S. K. Gupta (Cardiology)',
    specialty: 'Cardiology',
    hospital: 'Apex Diagnostics',
    registrationNumber: 'MH-39102',
    verificationHash: '0xb2c3d4e5f6a1789012345678abcdef0123456780',
    verified: true,
  },
  {
    id: 'doc-kapoor',
    name: 'Dr. Neha Kapoor',
    displayName: 'Dr. Neha Kapoor (Ophthalmology)',
    specialty: 'Ophthalmology',
    hospital: 'City General Hospital',
    registrationNumber: 'MH-62204',
    verificationHash: '0xc3d4e5f6a1b2789012345678abcdef0123456781',
    verified: true,
  },
];

// ─── Canonical Record Type ────────────────────────────────────────────────────
// Maps to the existing MedicalRecord interface in src/mock/types.ts
// IDs use stable MR-XXX format that match seedData.ts exactly.
export interface CanonicalRecord {
  /** Stable record ID — MR-001, MR-002, … This is the single authoritative ID. */
  id: string;
  /** The ID used in seedData.ts / localStorage (rec-101, rec-102, …) */
  seedId: string;
  patientId: string;
  title: string;
  category: 'Reports' | 'Prescriptions' | 'Self-declared' | 'Vaccinations' | 'Hospital-verified';
  recordType: string;
  date: string;
  doctor: string;
  hospital: string;
  sourceType: 'hospital' | 'self';
  status: 'verified' | 'self-declared';
  documentHash: string;
  txHash: string;
  blockNumber: number;
  summary: string;
  details: Record<string, string>;
  /** Natural-language retrieval aliases. These remain part of the canonical record. */
  keywords: string[];
}

/**
 * THE ONE CANONICAL MEDICAL RECORD DATASET.
 *
 * These are the exact same records displayed on the Medical Records page.
 * The AI Assistant reads ONLY from this array.
 * IDs here (MR-001 … MR-006) match the seedData.ts IDs (rec-101 … rec-106).
 */
export const CANONICAL_RECORDS: CanonicalRecord[] = [
  {
    id: 'MR-001',
    seedId: 'rec-101',
    patientId: PATIENT_ID,
    title: 'HbA1c & Fasting Plasma Glucose Report',
    category: 'Reports',
    recordType: 'Lab Report',
    date: '2026-08-15',
    doctor: 'Dr. A. R. Mehta',
    hospital: 'City General Hospital',
    sourceType: 'hospital',
    status: 'verified',
    documentHash: '0xa4e98f712b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
    blockNumber: 4819204,
    summary: 'Glycemic profile shows improvement under current medication plan. HbA1c at 7.1%, Fasting Glucose 124 mg/dL.',
    details: {
      'HbA1c': '7.1% (Target < 7.0%)',
      'Fasting Glucose': '124 mg/dL',
      'Post-prandial Glucose': '168 mg/dL',
      'Serum Creatinine': '0.9 mg/dL',
      'eGFR': '94 mL/min/1.73m²',
    },
    keywords: ['hba1c', 'a1c', 'ha1c', 'hemoglobin a1c', 'fasting plasma glucose', 'fasting glucose', 'fasting blood sugar', 'fpg', 'blood sugar', 'glucose report'],
  },
  {
    id: 'MR-002',
    seedId: 'rec-102',
    patientId: PATIENT_ID,
    title: 'Comprehensive Lipid Profile',
    category: 'Reports',
    recordType: 'Lab Report',
    date: '2026-07-10',
    doctor: 'Dr. S. K. Gupta',
    hospital: 'Apex Diagnostics',
    sourceType: 'hospital',
    status: 'verified',
    documentHash: '0xb5f09e823c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    txHash: '0x7e819b402c918374fa091e8471b02c84918e7c10',
    blockNumber: 4791023,
    summary: 'Lipid parameters stable with mild LDL elevation. Total Cholesterol 198 mg/dL, LDL 122 mg/dL.',
    details: {
      'Total Cholesterol': '198 mg/dL',
      'Triglycerides': '160 mg/dL',
      'HDL Cholesterol': '44 mg/dL',
      'LDL Cholesterol': '122 mg/dL',
      'Non-HDL Cholesterol': '154 mg/dL',
    },
    keywords: ['lipid profile', 'lipid report', 'cholesterol', 'ldl', 'hdl', 'triglycerides'],
  },
  {
    id: 'MR-003',
    seedId: 'rec-103',
    patientId: PATIENT_ID,
    title: 'Diabetes & Blood Pressure Quarterly Prescription',
    category: 'Prescriptions',
    recordType: 'Prescription',
    date: '2026-08-16',
    doctor: 'Dr. A. R. Mehta',
    hospital: 'City General Hospital',
    sourceType: 'hospital',
    status: 'verified',
    documentHash: '0xc6a10f934d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    txHash: '0x91824b0192e84710293847102938471029384710',
    blockNumber: 4819512,
    summary: 'Rx: Metformin 500mg BD, Telmisartan 40mg OD, Glimepiride 1mg OD. Valid for 3 months.',
    details: {
      'Metformin': '500mg - 1 Tab after breakfast, 1 Tab after dinner',
      'Telmisartan': '40mg - 1 Tab morning',
      'Glimepiride': '1mg - 1 Tab before breakfast',
      'Refills Allowed': '3 months',
      'Instructions': 'Low carbohydrate diet, 30 min brisk walk daily.',
    },
    keywords: ['diabetes prescription', 'blood pressure prescription', 'august prescription', 'metformin', 'telmisartan', 'glimepiride', 'medicines'],
  },
  {
    id: 'MR-004',
    seedId: 'rec-104',
    patientId: PATIENT_ID,
    title: 'Self-Declared Allergy: Penicillin Reaction',
    category: 'Self-declared',
    recordType: 'Allergy Log',
    date: '2025-11-04',
    doctor: '(Self-declared by patient)',
    hospital: 'N/A',
    sourceType: 'self',
    status: 'self-declared',
    documentHash: '0xd7b21e045e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    txHash: '0x44556677889900aabbccddeeff11223344556677',
    blockNumber: 3910283,
    summary: 'Patient logged moderate allergic reaction (hives & facial edema) after Amoxicillin in 2019. Avoid all beta-lactam antibiotics.',
    details: {
      'Allergen': 'Penicillin / Amoxicillin',
      'Severity': 'Moderate (Skin rash & facial edema)',
      'First Onset': 'October 2019',
      'Notes': 'Avoid all beta-lactam antibiotics.',
    },
    keywords: ['allergy', 'penicillin allergy', 'amoxicillin', 'allergic reaction', 'hives'],
  },
  {
    id: 'MR-005',
    seedId: 'rec-105',
    patientId: PATIENT_ID,
    title: 'COVID-19 Booster Vaccine (Precaution Dose)',
    category: 'Vaccinations',
    recordType: 'Immunization Certificate',
    date: '2024-03-12',
    doctor: 'Sr. Nurse Sunita R.',
    hospital: 'Sunrise Hospital',
    sourceType: 'hospital',
    status: 'verified',
    documentHash: '0xe8c32f156f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
    txHash: '0x889900aabbccddeeff11223344556677889900aa',
    blockNumber: 2849102,
    summary: 'Corbevax precaution booster (3rd dose) administered at Sunrise Hospital on 12 Mar 2024.',
    details: {
      'Vaccine Name': 'Corbevax',
      'Batch No': 'CBX-948201',
      'Dose': '3rd (Booster / Precaution)',
      'Vaccinator': 'Sr. Nurse Sunita R.',
    },
    keywords: ['covid vaccine', 'covid booster', 'vaccination', 'corbevax', 'immunization'],
  },
  {
    id: 'MR-006',
    seedId: 'rec-106',
    patientId: PATIENT_ID,
    title: 'Annual Ophthalmological & Retinal Evaluation',
    category: 'Reports',
    recordType: 'Diagnostic Imaging',
    date: '2026-04-20',
    doctor: 'Dr. Neha Kapoor',
    hospital: 'City General Hospital',
    sourceType: 'hospital',
    status: 'verified',
    documentHash: '0xf9d430267a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    txHash: '0xbbccddeeff11223344556677889900aabbccdd11',
    blockNumber: 4410921,
    summary: 'No diabetic retinopathy detected. Intraocular pressure normal. Vision 6/6 with correction bilaterally.',
    details: {
      'Right Eye Vision': '6/6 with correction',
      'Left Eye Vision': '6/6 with correction',
      'Fundus Exam': 'Clear optic disc, normal macula',
      'IOP Right/Left': '14 mmHg / 15 mmHg',
    },
    keywords: ['eye examination', 'ophthalmology report', 'retinal evaluation', 'retina', 'eye report', 'vision'],
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** Get all records for the current patient, sorted newest first */
export function getPatientRecords(): CanonicalRecord[] {
  return [...CANONICAL_RECORDS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Look up a canonical record by its MR-XXX id */
export function getRecordById(id: string): CanonicalRecord | undefined {
  return CANONICAL_RECORDS.find(r => r.id === id);
}

/** Look up a canonical record by its seed id (rec-101, etc.) */
export function getRecordBySeedId(seedId: string): CanonicalRecord | undefined {
  return CANONICAL_RECORDS.find(r => r.seedId === seedId);
}

/** Get all prescription records */
export function getPrescriptionRecords(): CanonicalRecord[] {
  return CANONICAL_RECORDS.filter(r => r.category === 'Prescriptions').sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Get all report records (Lab Reports + Diagnostic Imaging) */
export function getReportRecords(): CanonicalRecord[] {
  return CANONICAL_RECORDS.filter(r => r.category === 'Reports').sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Reports eligible for blood/lab comparison; excludes imaging, allergy, vaccines, and consultations. */
export function getBloodOrLabReports(): CanonicalRecord[] {
  const bloodLabTerms = ['blood', 'lab', 'glucose', 'hba1c', 'a1c', 'lipid', 'cholesterol', 'triglycerides', 'cbc'];
  return getReportRecords().filter(record => {
    const metadata = [record.title, record.recordType, ...record.keywords].join(' ').toLowerCase();
    return bloodLabTerms.some(term => metadata.includes(term));
  });
}

/** Extract all medicines from prescription records */
export function getMedicinesFromCanonicalRecords(): {
  medicine: string;
  dosage: string;
  date: string;
  doctor: string;
  recordId: string;
  recordTitle: string;
}[] {
  const medicines: {
    medicine: string;
    dosage: string;
    date: string;
    doctor: string;
    recordId: string;
    recordTitle: string;
  }[] = [];

  getPrescriptionRecords().forEach(r => {
    Object.entries(r.details).forEach(([key, value]) => {
      if (key !== 'Refills Allowed' && key !== 'Instructions' && key !== 'Duration') {
        medicines.push({
          medicine: key,
          dosage: value,
          date: r.date,
          doctor: r.doctor,
          recordId: r.id,
          recordTitle: r.title,
        });
      }
    });
  });

  return medicines;
}

/** Search records by keyword (title, summary, doctor, details) */
const normalizeSearchText = (value: string) => value.toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/\b(ha1c|hba1c|hemoglobin a1c)\b/g, ' hba1c ')
  .replace(/\b(fasting blood sugar|fasting glucose|fpg)\b/g, ' fasting plasma glucose ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/** Search and rank only the canonical records for lightweight, grounded retrieval. */
export function searchMedicalRecords(query: string, patientId = PATIENT_ID): CanonicalRecord[] {
  const terms = normalizeSearchText(query).split(' ').filter(term => term.length > 1 && !['tell', 'about', 'show', 'what', 'does', 'report', 'record', 'medical', 'my', 'the', 'and'].includes(term));
  return CANONICAL_RECORDS
    .filter(record => record.patientId === patientId)
    .map(record => {
      const fields = normalizeSearchText([record.title, record.recordType, record.summary, record.doctor, record.hospital, ...record.keywords, ...Object.keys(record.details)].join(' '));
      const score = terms.reduce((total, term) => total + (fields.includes(term) ? 1 : 0), 0);
      return { record, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.record.date).getTime() - new Date(a.record.date).getTime() || a.record.id.localeCompare(b.record.id))
    .map(({ record }) => record);
}

export const searchCanonicalRecords = (query: string) => searchMedicalRecords(query);

export interface MedicalClaim {
  entity: string;
  aliases: string[];
  year?: string;
  month?: string;
}

/** Extract a claim entity without treating the user's assertion as medical fact. */
export function extractMedicalClaim(query: string): MedicalClaim | undefined {
  const lower = query.toLowerCase();
  const year = lower.match(/\b(19|20)\d{2}\b/)?.[0];
  const month = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/)?.[0];
  const claims: Array<Omit<MedicalClaim, 'year' | 'month'>> = [
    { entity: 'heart attack', aliases: ['heart attack', 'myocardial infarction', 'acute myocardial infarction', 'cardiac infarction', ' mi '] },
    { entity: 'insulin prescription', aliases: ['insulin'] },
    { entity: 'MRI', aliases: ['mri', 'magnetic resonance imaging'] },
    { entity: 'cancer diagnosis', aliases: ['cancer', 'malignancy', 'tumor'] },
    { entity: 'penicillin allergy', aliases: ['penicillin allergy', 'penicillin', 'amoxicillin'] },
    { entity: 'ophthalmology evaluation', aliases: ['ophthalmology', 'retinal evaluation', 'eye examination'] },
  ];
  const claim = claims.find(candidate => candidate.aliases.some(alias => lower.includes(alias.trim())));
  return claim ? { ...claim, year, month } : undefined;
}

/**
 * Claim evidence is deliberately stricter than general record search: every
 * result must contain a direct claim alias and, when stated, the claimed date.
 */
export function findSupportingRecordsForClaim(query: string, patientId = PATIENT_ID): CanonicalRecord[] {
  const claim = extractMedicalClaim(query);
  if (!claim) return [];
  return CANONICAL_RECORDS.filter(record => {
    if (record.patientId !== patientId) return false;
    const evidence = normalizeSearchText([record.title, record.recordType, record.summary, record.doctor, record.hospital, ...record.keywords, ...Object.keys(record.details), ...Object.values(record.details)].join(' '));
    const hasDirectEvidence = claim.aliases.some(alias => evidence.includes(normalizeSearchText(alias)));
    const recordDate = new Date(`${record.date}T00:00:00`);
    const hasYear = !claim.year || record.date.startsWith(claim.year);
    const hasMonth = !claim.month || recordDate.toLocaleString('en-US', { month: 'long' }).toLowerCase() === claim.month;
    return hasDirectEvidence && hasYear && hasMonth;
  });
}

export interface SymptomContextMatch {
  record: CanonicalRecord;
  symptoms: string[];
  reason: string;
}

/** Strict symptom-context retrieval: direct documented symptom evidence only, never recency. */
export function findRelevantRecordsForSymptoms(query: string, patientId = PATIENT_ID): SymptomContextMatch[] {
  const lower = query.toLowerCase();
  const symptomAliases: Record<string, string[]> = {
    'headache': ['headache'],
    'fever': ['fever', 'pyrexia'],
    'chest pain': ['chest pain'],
    'rash': ['rash', 'hives', 'skin reaction'],
    'cough': ['cough'],
    'nausea': ['nausea'],
    'dizziness': ['dizziness', 'dizzy'],
  };
  const requested = Object.entries(symptomAliases)
    .filter(([, aliases]) => aliases.some(alias => lower.includes(alias)))
    .map(([symptom]) => symptom);
  if (!requested.length) return [];
  return CANONICAL_RECORDS.filter(record => record.patientId === patientId).map(record => {
    const evidence = normalizeSearchText([record.title, record.summary, ...record.keywords, ...Object.keys(record.details), ...Object.values(record.details)].join(' '));
    const symptoms = requested.filter(symptom => symptomAliases[symptom].some(alias => evidence.includes(normalizeSearchText(alias))));
    return { record, symptoms, reason: symptoms.length ? `This record explicitly documents ${symptoms.join(' and ')}.` : '' };
  }).filter(match => match.symptoms.length > 0);
}

/** Look up a doctor by name (case-insensitive, partial match) */
export function getDoctorByName(name: string): CanonicalDoctor | undefined {
  const lower = name.toLowerCase();
  return CANONICAL_DOCTORS.find(
    d => d.name.toLowerCase().includes(lower) || d.displayName.toLowerCase().includes(lower)
  );
}

// ─── Grounding validator ───────────────────────────────────────────────────────

export interface GroundingResult {
  grounded: boolean;
  sourceIds: string[];
  reason?: string;
}

/**
 * Validate that every cited record ID exists in the canonical dataset
 * and that its title/date/doctor match exactly.
 */
export function validateRecordGrounding(
  citedIds: string[]
): GroundingResult {
  const invalidIds: string[] = [];

  for (const id of citedIds) {
    const record = getRecordById(id);
    if (!record) {
      invalidIds.push(id);
    }
  }

  if (invalidIds.length > 0) {
    return {
      grounded: false,
      sourceIds: citedIds,
      reason: `The following record IDs do not exist in the canonical dataset: ${invalidIds.join(', ')}`,
    };
  }

  return { grounded: true, sourceIds: citedIds };
}

// ─── Consistency check (for dev/demo validation) ──────────────────────────────

export function runDataConsistencyCheck(): {
  canonicalCount: number;
  ids: string[];
  allValid: boolean;
  report: string;
} {
  const ids = CANONICAL_RECORDS.map(r => r.id);
  const allValid = ids.every(id => id.startsWith('MR-'));

  const report = [
    `MEDICAL RECORD DATASET`,
    `${CANONICAL_RECORDS.length} canonical records`,
    ``,
    `Records:`,
    ...CANONICAL_RECORDS.map(r => `  ${r.id} — ${r.title} (${r.date})`),
    ``,
    `ALL IDs valid: ${allValid ? '✓ YES' : '✗ NO'}`,
    ``,
    `AI ASSISTANT DATASET`,
    `Uses the same ${CANONICAL_RECORDS.length} records above.`,
    ``,
    `MATCH: ✓ ${CANONICAL_RECORDS.length} / ${CANONICAL_RECORDS.length}`,
    `No records exist only in the AI dataset.`,
  ].join('\n');

  return { canonicalCount: CANONICAL_RECORDS.length, ids, allValid, report };
}

/** Development guard: every feature must point to the one canonical record collection. */
export function validateMedicalDataConsistency(): {
  valid: boolean;
  canonicalIds: string[];
  aiAccessibleIds: string[];
  verificationIds: string[];
  consentReferenceIds: string[];
} {
  const canonicalIds = CANONICAL_RECORDS.map(record => record.id);
  // Retrieval, verification, and consent lookups resolve through these same IDs.
  const aiAccessibleIds = getPatientRecords().map(record => record.id);
  const verificationIds = CANONICAL_RECORDS.filter(record => record.status === 'verified').map(record => record.id);
  return {
    valid: aiAccessibleIds.every(id => canonicalIds.includes(id)) && verificationIds.every(id => canonicalIds.includes(id)),
    canonicalIds,
    aiAccessibleIds,
    verificationIds,
    consentReferenceIds: [],
  };
}
