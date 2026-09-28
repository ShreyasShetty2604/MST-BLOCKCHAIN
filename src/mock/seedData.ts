import type { PatientPersona, MedicalRecord, Consent, AuditLog, Hospital, CheckupReminder, SystemStats, IncomingAccessRequest } from './types.ts';

export const INITIAL_PERSONAS: PatientPersona[] = [
  {
    id: 'persona-diabetic',
    name: 'Rajesh Kumar',
    mediId: '91-4827-6153-2043',
    vaultId: 'VLT-8F29A31B72C1',
    dob: '1974-05-14',
    gender: 'Male',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@example.com',
    dnaSaltedHash: '0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8fa1b2c3d4e5f6a7b8c9d0e1f2',
    emergencyInfo: {
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Dust Mites'],
      conditions: ['Type 2 Diabetes Mellitus', 'Mild Hypertension'],
      medications: [
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily after meals' },
        { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily morning' },
        { name: 'Glimepiride', dosage: '1mg', frequency: 'Once daily before breakfast' }
      ],
      emergencyContact: {
        name: 'Sunita Kumar',
        relation: 'Spouse',
        phone: '+91 98765 43211'
      }
    },
    verifiedRecordCount: 12,
    activeConsentCount: 2,
    lastAccessTime: '3h ago'
  },
  {
    id: 'persona-healthy',
    name: 'Ananya Sharma',
    mediId: '91-5454-3297-1210',
    vaultId: 'VLT-C14B6C917DF5',
    dob: '2001-09-22',
    gender: 'Female',
    phone: '+91 91234 56789',
    email: 'ananya.sharma@example.com',
    dnaSaltedHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0ba1b2c3d4e5f6a7b8c9d0e1f2',
    emergencyInfo: {
      bloodGroup: 'O+',
      allergies: ['Peanuts'],
      conditions: ['Mild Asthmatic Tendency'],
      medications: [
        { name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed' }
      ],
      emergencyContact: {
        name: 'Rohan Sharma',
        relation: 'Brother',
        phone: '+91 91234 56790'
      }
    },
    verifiedRecordCount: 8,
    activeConsentCount: 1,
    lastAccessTime: '1d ago'
  },
  {
    id: 'persona-hypertensive',
    name: 'Vikram Malhotra',
    mediId: '91-6828-7814-5965',
    vaultId: 'VLT-34D639BEDC80',
    dob: '1966-11-03',
    gender: 'Male',
    phone: '+91 99887 76655',
    email: 'vikram.m@example.com',
    dnaSaltedHash: '0x3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d',
    emergencyInfo: {
      bloodGroup: 'A-',
      allergies: ['Sulfa Drugs', 'Aspirin'],
      conditions: ['Essential Hypertension', 'Hyperlipidemia', 'Coronary Artery Disease'],
      medications: [
        { name: 'Atorvastatin', dosage: '20mg', frequency: 'At bedtime' },
        { name: 'Amlodipine', dosage: '5mg', frequency: 'Morning' },
        { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily' }
      ],
      emergencyContact: {
        name: 'Priya Malhotra',
        relation: 'Daughter',
        phone: '+91 99887 76656'
      }
    },
    verifiedRecordCount: 14,
    activeConsentCount: 3,
    lastAccessTime: '15m ago'
  }
];

export const INITIAL_RECORDS: Record<string, MedicalRecord[]> = {
  'persona-diabetic': [
    {
      id: 'rec-101',
      title: 'HbA1c & Fasting Plasma Glucose Report',
      category: 'Reports',
      recordType: 'Lab Report',
      source: 'City General Hospital',
      sourceType: 'hospital',
      date: '2026-08-15',
      doctor: 'Dr. A. R. Mehta (Endocrinology)',
      txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
      blockNumber: 4819204,
      version: 2,
      previousVersionHash: '0x1e8a93b42c107f9d8e7c6b5a4f3e2d1c0b9a8f7e',
      diffSummary: [
        { field: 'HbA1c Value', oldValue: '7.8%', newValue: '7.1%' },
        { field: 'Fasting Blood Sugar', oldValue: '142 mg/dL', newValue: '124 mg/dL' },
        { field: 'Doctor Note', oldValue: 'Adjust Metformin dosage', newValue: 'Glycemic control improved' }
      ],
      status: 'verified',
      payload: {
        summary: 'Glycemic profile shows improvement under current medication plan.',
        details: {
          'HbA1c': '7.1% (Target < 7.0%)',
          'Fasting Glucose': '124 mg/dL',
          'Post-prandial Glucose': '168 mg/dL',
          'Serum Creatinine': '0.9 mg/dL',
          'eGFR': '94 mL/min/1.73m²'
        },
        attachments: [
          { name: 'HbA1c_LabResult_Aug2026.pdf', size: '1.4 MB', type: 'application/pdf' }
        ],
        signedBy: 'City General Central Diagnostic Lab',
        signatureHash: '0x992a8310bcfe1048e9182390141a0293184f'
      },
      hash: '0xa4e98f712b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e'
    },
    {
      id: 'rec-102',
      title: 'Comprehensive Lipid Profile',
      category: 'Reports',
      recordType: 'Lab Report',
      source: 'Apex Diagnostics',
      sourceType: 'hospital',
      date: '2026-07-10',
      doctor: 'Dr. S. K. Gupta (Cardiology)',
      txHash: '0x7e819b402c918374fa091e8471b02c84918e7c10',
      blockNumber: 4791023,
      version: 1,
      status: 'verified',
      payload: {
        summary: 'Lipid parameters stable with mild LDL elevation.',
        details: {
          'Total Cholesterol': '198 mg/dL',
          'Triglycerides': '160 mg/dL',
          'HDL Cholesterol': '44 mg/dL',
          'LDL Cholesterol': '122 mg/dL',
          'Non-HDL Cholesterol': '154 mg/dL'
        },
        signedBy: 'Apex Clinical Pathology Wing',
        signatureHash: '0x881e723901abcf84710293847102938471092834'
      },
      hash: '0xb5f09e823c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f'
    },
    {
      id: 'rec-103',
      title: 'Diabetes & Blood Pressure Quarterly Prescription',
      category: 'Prescriptions',
      recordType: 'Prescription',
      source: 'City General Hospital',
      sourceType: 'hospital',
      date: '2026-08-16',
      doctor: 'Dr. A. R. Mehta',
      txHash: '0x91824b0192e84710293847102938471029384710',
      blockNumber: 4819512,
      version: 1,
      status: 'verified',
      payload: {
        summary: 'Rx: Metformin 500mg BD, Telmisartan 40mg OD, Glimepiride 1mg OD.',
        details: {
          'Metformin': '500mg - 1 Tab after breakfast, 1 Tab after dinner',
          'Telmisartan': '40mg - 1 Tab morning',
          'Glimepiride': '1mg - 1 Tab before breakfast',
          'Refills Allowed': '3 months',
          'Instructions': 'Low carbohydrate diet, 30 min brisk walk daily.'
        },
        signedBy: 'Dr. A. R. Mehta (Reg #MH-48201)',
        signatureHash: '0x11223344556677889900aabbccddeeff11223344'
      },
      hash: '0xc6a10f934d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'
    },
    {
      id: 'rec-104',
      title: 'Self-Declared Allergy: Penicillin Reaction',
      category: 'Self-declared',
      recordType: 'Allergy Log',
      source: 'Patient (Self-declared)',
      sourceType: 'self',
      date: '2025-11-04',
      txHash: '0x44556677889900aabbccddeeff11223344556677',
      blockNumber: 3910283,
      version: 1,
      status: 'self-declared',
      payload: {
        summary: 'Patient logged mild hives & swelling after Amoxicillin in 2019.',
        details: {
          'Allergen': 'Penicillin / Amoxicillin',
          'Severity': 'Moderate (Skin rash & facial edema)',
          'First Onset': 'October 2019',
          'Notes': 'Avoid all beta-lactam antibiotics.'
        }
      },
      hash: '0xd7b21e045e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'
    },
    {
      id: 'rec-105',
      title: 'COVID-19 Booster Vaccine (Precaution Dose)',
      category: 'Vaccinations',
      recordType: 'Immunization Certificate',
      source: 'Sunrise Hospital',
      sourceType: 'hospital',
      date: '2024-03-12',
      txHash: '0x889900aabbccddeeff11223344556677889900aa',
      blockNumber: 2849102,
      version: 1,
      status: 'verified',
      payload: {
        summary: 'Corbevax precaution booster administered.',
        details: {
          'Vaccine Name': 'Corbevax',
          'Batch No': 'CBX-948201',
          'Dose': '3rd (Booster)',
          'Vaccinator': 'Sr. Nurse Sunita R.'
        },
        signedBy: 'Sunrise Hospital Immunization Registry'
      },
      hash: '0xe8c32f156f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c'
    },
    {
      id: 'rec-106',
      title: 'Annual Ophthalmological & Retinal Evaluation',
      category: 'Reports',
      recordType: 'Diagnostic Imaging',
      source: 'City General Hospital',
      sourceType: 'hospital',
      date: '2026-04-20',
      doctor: 'Dr. Neha Kapoor (Ophthalmology)',
      txHash: '0xbbccddeeff11223344556677889900aabbccdd11',
      blockNumber: 4410921,
      version: 1,
      status: 'verified',
      payload: {
        summary: 'No diabetic retinopathy detected. Intraocular pressure normal.',
        details: {
          'Right Eye Vision': '6/6 with correction',
          'Left Eye Vision': '6/6 with correction',
          'Fundus Exam': 'Clear optic disc, normal macula',
          'IOP Right/Left': '14 mmHg / 15 mmHg'
        },
        signedBy: 'City Eye Care Center'
      },
      hash: '0xf9d430267a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d'
    }
  ],
  'persona-healthy': [],
  'persona-hypertensive': []
};

export const INITIAL_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-01',
    name: 'City General Hospital',
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    status: 'Approved',
    trustScore: 99.4,
    emergencyAccessCount: 3,
    registeredAt: '2024-01-15'
  },
  {
    id: 'hosp-02',
    name: 'Sunrise Hospital',
    walletAddress: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
    status: 'Approved',
    trustScore: 98.1,
    emergencyAccessCount: 1,
    registeredAt: '2024-05-10'
  },
  {
    id: 'hosp-03',
    name: 'Apex Diagnostics',
    walletAddress: '0xbDA5747bFD65F08D54719875937649A2d3082f50',
    status: 'Approved',
    trustScore: 99.8,
    emergencyAccessCount: 0,
    registeredAt: '2024-08-20'
  }
];

export const INITIAL_CONSENTS: Consent[] = [
  {
    id: 'cons-1',
    hospitalId: 'hosp-01',
    hospitalName: 'City General Hospital',
    tier: 'Tier 2',
    tierLabel: 'Full Clinical History Access',
    grantedAt: '2026-09-28T14:30:00Z',
    expiresAt: new Date(Date.now() + 4 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
    status: 'active',
    txHash: '0xa1b2c3d4e5f67890123456789abcdef012345678',
    reason: 'Routine quarterly diabetes checkup and treatment evaluation.'
  },
  {
    id: 'cons-2',
    hospitalId: 'hosp-03',
    hospitalName: 'Apex Diagnostics',
    tier: 'Tier 1',
    tierLabel: 'Emergency Profile & Basic Info Only',
    grantedAt: '2026-09-27T09:00:00Z',
    expiresAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    status: 'active',
    txHash: '0xb2c3d4e5f6a17890123456789abcdef012345679',
    reason: 'Blood test order verification.'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-101',
    eventType: 'Access',
    actor: 'Dr. A. R. Mehta (City General Hospital)',
    action: 'Viewed Tier 2 Clinical History (HbA1c & Prescriptions)',
    timestamp: '3 hours ago',
    txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
    blockNumber: 4819515,
    isEmergency: false
  },
  {
    id: 'aud-102',
    eventType: 'Consent Granted',
    actor: 'Rajesh Kumar (Patient)',
    action: 'Granted Tier 2 Access to City General Hospital for 24 Hours',
    timestamp: '4 hours ago',
    txHash: '0xa1b2c3d4e5f67890123456789abcdef012345678',
    blockNumber: 4819490,
    isEmergency: false
  },
  {
    id: 'aud-103',
    eventType: 'AI Read',
    actor: 'MediVault Assistant (AI Service)',
    action: 'Read age (52), conditions, and allergies for symptom guidance',
    timestamp: '5 hours ago',
    txHash: '0xc3d4e5f6a1b27890123456789abcdef012345680',
    blockNumber: 4819410,
    isEmergency: false
  },
  {
    id: 'aud-104',
    eventType: 'Integrity Check',
    actor: 'Automated Audit Daemon',
    action: 'Ran cryptographic checksum scan on 6 records: 6 Verified, 0 Tampered',
    timestamp: '12 hours ago',
    txHash: '0xd4e5f6a1b2c37890123456789abcdef012345681',
    blockNumber: 4818900,
    isEmergency: false
  },
  {
    id: 'aud-105',
    eventType: 'Emergency Access',
    actor: 'Dr. V. Sharma (Sunrise Hospital ER)',
    action: 'BREAK-GLASS: Unsanctioned Emergency Tier 1 Access invoked (Reason: Acute Respiratory Distress)',
    timestamp: '2 days ago',
    txHash: '0xe5f6a1b2c3d47890123456789abcdef012345682',
    blockNumber: 4810200,
    isEmergency: true,
    isFlagged: false
  },
  {
    id: 'aud-106',
    eventType: 'Record Added',
    actor: 'City General Central Diagnostic Lab',
    action: 'Anchored new lab record: HbA1c & Fasting Plasma Glucose Report (v2)',
    timestamp: '2026-08-15 11:20 AM',
    txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2',
    blockNumber: 4819204,
    isEmergency: false
  },
  {
    id: 'aud-107',
    eventType: 'Consent Revoked',
    actor: 'Rajesh Kumar (Patient)',
    action: 'Revoked Tier 2 Access for Metro Heart Institute ahead of expiry',
    timestamp: '2026-08-01 04:15 PM',
    txHash: '0xf6a1b2c3d4e57890123456789abcdef012345683',
    blockNumber: 4801100,
    isEmergency: false
  }
];

export const INITIAL_REMINDERS: CheckupReminder[] = [
  {
    id: 'rem-1',
    title: 'HbA1c & Glycemic Control Check',
    dueState: 'due',
    dueStateLabel: 'Due in 12 days',
    dueDate: '2026-10-10',
    daysRemaining: 12,
    lastDoneDate: '2026-08-15',
    hospitalVerified: true,
    hospitalName: 'City General Hospital',
    txHash: '0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2'
  },
  {
    id: 'rem-2',
    title: 'Blood Pressure Monitoring',
    dueState: 'due',
    dueStateLabel: 'Due in 5 days',
    dueDate: '2026-10-03',
    daysRemaining: 5,
    lastDoneDate: '2026-09-03',
    hospitalVerified: true,
    hospitalName: 'City General Hospital',
    txHash: '0x91824b0192e84710293847102938471029384710'
  },
  {
    id: 'rem-3',
    title: 'Comprehensive Eye & Retinal Screening',
    dueState: 'done',
    dueStateLabel: 'Done (Valid 7 mos)',
    dueDate: '2027-04-20',
    daysRemaining: 204,
    lastDoneDate: '2026-04-20',
    hospitalVerified: true,
    hospitalName: 'City General Hospital',
    txHash: '0xbbccddeeff11223344556677889900aabbccdd11'
  },
  {
    id: 'rem-4',
    title: 'Annual Lipid Profile Test',
    dueState: 'overdue',
    dueStateLabel: 'Overdue by 14 days',
    dueDate: '2026-09-14',
    daysRemaining: -14,
    lastDoneDate: '2025-09-14',
    hospitalVerified: true,
    hospitalName: 'Apex Diagnostics',
    txHash: '0x7e819b402c918374fa091e8471b02c84918e7c10'
  }
];

export const INITIAL_REQUESTS: IncomingAccessRequest[] = [
  {
    id: 'req-201',
    hospitalId: 'hosp-02',
    hospitalName: 'Sunrise Hospital',
    reason: 'Emergency department triage verification for requested Consultation.',
    requestedTier: 'Tier 2',
    requestedAt: '10 minutes ago'
  }
];

export const INITIAL_STATS: SystemStats = {
  totalVaults: 14829,
  recordsAnchored: 184920,
  consentsGranted: 49210,
  emergenciesUsed: 142,
  networkStatus: 'Polygon Amoy Testnet (Chain ID: 80002)',
  dailyAuditsTrend: [
    { day: 'Mon', accesses: 1240, emergencies: 4 },
    { day: 'Tue', accesses: 1450, emergencies: 2 },
    { day: 'Wed', accesses: 1320, emergencies: 5 },
    { day: 'Thu', accesses: 1680, emergencies: 1 },
    { day: 'Fri', accesses: 1890, emergencies: 3 },
    { day: 'Sat', accesses: 980, emergencies: 8 },
    { day: 'Sun', accesses: 820, emergencies: 6 }
  ]
};
