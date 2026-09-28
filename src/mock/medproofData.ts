// MedProof Synthetic Demo Data
// HACKATHON DEMO ONLY — All data is synthetic/fake

export interface MedProofRecord {
  id: string;
  title: string;
  type: 'blood_report' | 'prescription' | 'allergy' | 'consultation' | 'lab_report' | 'emergency';
  date: string;
  doctor: string;
  hospital: string;
  status: 'verified' | 'self-declared';
  documentHash: string;
  blockNumber: number;
  txHash: string;
  details: Record<string, string>;
  summary: string;
}

export interface MedProofDoctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  verified: boolean;
  verificationHash: string;
  registrationNumber: string;
}

export interface MedProofConsent {
  id: string;
  recordId: string;
  recipientDoctor: string;
  recipientDoctorId: string;
  grantedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
  txHash: string;
}

export const DEMO_PATIENT = {
  name: 'Rajesh Kumar',
  id: 'patient-rajesh',
  mediId: '91-2345-6789-0123',
  dob: '1974-05-14',
  bloodGroup: 'B+',
  allergies: ['Penicillin', 'Dust Mites'],
  conditions: ['Type 2 Diabetes Mellitus', 'Mild Hypertension'],
};

export const DEMO_DOCTORS: MedProofDoctor[] = [
  {
    id: 'doc-sharma',
    name: 'Dr. Sharma',
    specialty: 'General Medicine',
    hospital: 'City General Hospital',
    verified: true,
    verificationHash: '0xa1b2c3d4e5f6789012345678abcdef0123456789',
    registrationNumber: 'MH-39201',
  },
  {
    id: 'doc-patel',
    name: 'Dr. Patel',
    specialty: 'Endocrinology',
    hospital: 'Sunrise Hospital',
    verified: true,
    verificationHash: '0xb2c3d4e5f6a1789012345678abcdef0123456789',
    registrationNumber: 'MH-48202',
  },
];

export const DEMO_RECORDS: MedProofRecord[] = [
  {
    id: 'mpr-001',
    title: 'Blood Report - January 2026',
    type: 'blood_report',
    date: '2026-01-15',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
    blockNumber: 4710204,
    txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
    details: {
      'Hemoglobin': '13.2 g/dL',
      'WBC Count': '7,200 /μL',
      'Platelet Count': '2.1 L/μL',
      'Fasting Blood Sugar': '142 mg/dL',
      'HbA1c': '7.8%',
      'Total Cholesterol': '210 mg/dL',
      'Triglycerides': '178 mg/dL',
      'Creatinine': '0.9 mg/dL',
    },
    summary: 'Routine blood workup showing mildly elevated fasting blood sugar and HbA1c. Lipid panel slightly above optimal range.',
  },
  {
    id: 'mpr-002',
    title: 'Blood Report - September 2026',
    type: 'blood_report',
    date: '2026-09-10',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0x7e819b402c918374fa091e8471b02c84918e7c10',
    blockNumber: 4819204,
    txHash: '0x7e819b402c918374fa091e8471b02c84918e7c10',
    details: {
      'Hemoglobin': '14.0 g/dL',
      'WBC Count': '6,800 /μL',
      'Platelet Count': '2.3 L/μL',
      'Fasting Blood Sugar': '124 mg/dL',
      'HbA1c': '7.1%',
      'Total Cholesterol': '198 mg/dL',
      'Triglycerides': '160 mg/dL',
      'Creatinine': '0.9 mg/dL',
    },
    summary: 'Follow-up blood workup showing improvement in glycemic control. HbA1c reduced from 7.8% to 7.1%. Lipid panel within acceptable range.',
  },
  {
    id: 'mpr-003',
    title: 'Prescription - August 2026',
    type: 'prescription',
    date: '2026-08-03',
    doctor: 'Dr. Patel',
    hospital: 'Sunrise Hospital',
    status: 'verified',
    documentHash: '0x91824b0192e84710293847102938471029384710',
    blockNumber: 4819512,
    txHash: '0x91824b0192e84710293847102938471029384710',
    details: {
      'Metformin': '500mg - Twice daily after meals',
      'Telmisartan': '40mg - Once daily morning',
      'Glimepiride': '1mg - Once daily before breakfast',
      'Duration': '3 months',
      'Instructions': 'Low carbohydrate diet, 30 min brisk walk daily',
    },
    summary: 'Rx: Metformin 500mg BD, Telmisartan 40mg OD, Glimepiride 1mg OD. Valid for 3 months.',
  },
  {
    id: 'mpr-004',
    title: 'Prescription - March 2026',
    type: 'prescription',
    date: '2026-03-18',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0x44556677889900aabbccddeeff11223344556677',
    blockNumber: 4510283,
    txHash: '0x44556677889900aabbccddeeff11223344556677',
    details: {
      'Metformin': '500mg - Twice daily after meals',
      'Telmisartan': '40mg - Once daily morning',
      'Atorvastatin': '10mg - Once at bedtime',
      'Duration': '3 months',
      'Instructions': 'Monitor blood sugar weekly, maintain food diary',
    },
    summary: 'Rx: Metformin 500mg BD, Telmisartan 40mg OD, Atorvastatin 10mg HS. Follow-up in 3 months.',
  },
  {
    id: 'mpr-005',
    title: 'Allergy Record',
    type: 'allergy',
    date: '2025-11-04',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0x889900aabbccddeeff11223344556677889900aa',
    blockNumber: 3910283,
    txHash: '0x889900aabbccddeeff11223344556677889900aa',
    details: {
      'Allergen': 'Penicillin / Amoxicillin',
      'Reaction Type': 'Skin rash & facial edema',
      'Severity': 'Moderate',
      'First Onset': 'October 2019',
      'Recommendation': 'Avoid all beta-lactam antibiotics',
    },
    summary: 'Documented allergy to Penicillin class antibiotics. Patient experienced moderate allergic reaction (hives & swelling) after Amoxicillin in 2019.',
  },
  {
    id: 'mpr-006',
    title: 'Consultation Note',
    type: 'consultation',
    date: '2026-07-22',
    doctor: 'Dr. Patel',
    hospital: 'Sunrise Hospital',
    status: 'verified',
    documentHash: '0xbbccddeeff11223344556677889900aabbccdd11',
    blockNumber: 4791023,
    txHash: '0xbbccddeeff11223344556677889900aabbccdd11',
    details: {
      'Chief Complaint': 'Routine diabetes follow-up',
      'Examination': 'BP 130/82 mmHg, Weight 78kg, BMI 26.1',
      'Assessment': 'Type 2 Diabetes - improving glycemic control',
      'Plan': 'Continue current medications, recheck HbA1c in 2 months',
      'Follow-up': 'September 2026',
    },
    summary: 'Routine endocrinology consultation. Glycemic control improving. Blood pressure within acceptable range. Continue current treatment plan.',
  },
  {
    id: 'mpr-007',
    title: 'Lab Report - Lipid Panel',
    type: 'lab_report',
    date: '2026-07-10',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0xccddeeff11223344556677889900aabbccddeeff',
    blockNumber: 4780102,
    txHash: '0xccddeeff11223344556677889900aabbccddeeff',
    details: {
      'Total Cholesterol': '198 mg/dL',
      'Triglycerides': '160 mg/dL',
      'HDL Cholesterol': '44 mg/dL',
      'LDL Cholesterol': '122 mg/dL',
      'VLDL': '32 mg/dL',
      'Non-HDL Cholesterol': '154 mg/dL',
    },
    summary: 'Lipid parameters stable. Mild LDL elevation. Continue current statin regimen and dietary modifications.',
  },
  {
    id: 'mpr-008',
    title: 'Emergency Visit Record',
    type: 'emergency',
    date: '2026-02-14',
    doctor: 'Dr. Sharma',
    hospital: 'City General Hospital',
    status: 'verified',
    documentHash: '0xddeeff11223344556677889900aabbccddeeff00',
    blockNumber: 4490501,
    txHash: '0xddeeff11223344556677889900aabbccddeeff00',
    details: {
      'Presenting Complaint': 'Severe headache with dizziness',
      'Vitals on Arrival': 'BP 168/96 mmHg, HR 92 bpm, SpO2 98%',
      'Diagnosis': 'Hypertensive urgency',
      'Treatment': 'IV Labetalol, oral Amlodipine 5mg stat',
      'Outcome': 'BP reduced to 138/88 mmHg, discharged after 4hr observation',
      'Follow-up': 'Cardiology review within 1 week',
    },
    summary: 'Emergency visit for hypertensive urgency. BP stabilized with IV medication. Discharged same day with follow-up instructions.',
  },
];

export const DEMO_CONSENTS: MedProofConsent[] = [
  {
    id: 'consent-001',
    recordId: 'mpr-002',
    recipientDoctor: 'Dr. Sharma',
    recipientDoctorId: 'doc-sharma',
    grantedAt: '2026-09-28T10:00:00Z',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    status: 'active',
    txHash: '0xf1a2b3c4d5e6f7890123456789abcdef01234567',
  },
  {
    id: 'consent-002',
    recordId: 'mpr-003',
    recipientDoctor: 'Dr. Sharma',
    recipientDoctorId: 'doc-sharma',
    grantedAt: '2026-09-27T09:00:00Z',
    expiresAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'expired',
    txHash: '0xa2b3c4d5e6f1a890123456789abcdef01234568',
  },
];

// Helper functions for the chatbot retrieval
export function getRecordsByType(type: MedProofRecord['type']): MedProofRecord[] {
  return DEMO_RECORDS.filter(r => r.type === type);
}

export function getRecordById(id: string): MedProofRecord | undefined {
  return DEMO_RECORDS.find(r => r.id === id);
}

export function getDoctorById(id: string): MedProofDoctor | undefined {
  return DEMO_DOCTORS.find(d => d.id === id);
}

export function getDoctorByName(name: string): MedProofDoctor | undefined {
  return DEMO_DOCTORS.find(d => d.name.toLowerCase() === name.toLowerCase());
}

export function getActiveConsentsForDoctor(doctorId: string): MedProofConsent[] {
  return DEMO_CONSENTS.filter(c => c.recipientDoctorId === doctorId && c.status === 'active');
}

export function getRecordsSortedByDate(): MedProofRecord[] {
  return [...DEMO_RECORDS].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function searchRecords(query: string): MedProofRecord[] {
  const lower = query.toLowerCase();
  return DEMO_RECORDS.filter(r =>
    r.title.toLowerCase().includes(lower) ||
    r.summary.toLowerCase().includes(lower) ||
    r.doctor.toLowerCase().includes(lower) ||
    r.type.toLowerCase().includes(lower) ||
    Object.values(r.details).some(v => v.toLowerCase().includes(lower))
  );
}

export function getMedicinesFromRecords(): { medicine: string; dosage: string; date: string; doctor: string; recordId: string; recordTitle: string }[] {
  const medicines: { medicine: string; dosage: string; date: string; doctor: string; recordId: string; recordTitle: string }[] = [];
  DEMO_RECORDS.filter(r => r.type === 'prescription').forEach(r => {
    Object.entries(r.details).forEach(([key, value]) => {
      if (key !== 'Duration' && key !== 'Instructions') {
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
  return medicines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
