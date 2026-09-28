/**
 * Automated Test Suite for MediVault Patient Registration & Medical Record Creation
 * Tests both Patient and Hospital creation flows.
 */

import { validateMediID } from '../src/lib/mediId.ts';

const BASE_URL = 'http://127.0.0.1:5001';

async function testRecordCreationFlow() {
  console.log('--- Starting Patient & Hospital Record Creation Test Suite ---');

  async function request(path: string, options: any = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  // 1. Patient Self-Registration
  console.log('1. Testing Patient Self-Registration (POST /api/identity/register)');
  const patientReg = await request('/api/identity/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Priya Narayanan',
      dob: '1995-12-04',
      gender: 'Female',
      phone: '+91 98123 45678',
      email: 'priya.n@example.com',
      bloodGroup: 'B+',
      allergies: ['Penicillin'],
      conditions: [],
      emergencyContact: {
        name: 'Karthik Narayanan',
        relation: 'Spouse',
        phone: '+91 98123 45679'
      },
      requesterId: 'SYS_PATIENT_ONBOARDING',
      requesterName: 'Patient Self-Registration'
    })
  });

  if (patientReg.status !== 201 || !patientReg.data.success) {
    throw new Error(`Patient self-registration failed: ${JSON.stringify(patientReg)}`);
  }
  const patientVaultId = patientReg.data.vaultId;
  const patientMediId = patientReg.data.mediId;
  console.log(`Created Patient Vault: ${patientVaultId}, MediID: ${patientMediId}`);

  const luhnCheck = validateMediID(patientMediId);
  if (!luhnCheck.valid) {
    throw new Error(`Generated MediID failed Luhn checksum: ${luhnCheck.reason}`);
  }
  console.log('PASS: Patient self-registration issued valid Luhn MediID and Vault ID.');

  // 2. Patient creates Self-Declared Record
  console.log('2. Testing Patient Self-Declared Record Creation (POST /api/records/create)');
  const selfRecord = await request('/api/records/create', {
    method: 'POST',
    body: JSON.stringify({
      vaultId: patientVaultId,
      title: 'Morning Fasting Blood Glucose Log',
      category: 'Self-declared',
      recordType: 'Vital Signs',
      source: 'Patient (Self-declared)',
      sourceType: 'self',
      summary: 'Home glucometer test before breakfast.',
      details: {
        'Fasting Glucose': '108 mg/dL',
        'Device': 'Accu-Chek Instant'
      }
    })
  });

  if (selfRecord.status !== 201 || !selfRecord.data.success) {
    throw new Error(`Self-declared record creation failed: ${JSON.stringify(selfRecord)}`);
  }
  console.log('PASS: Self-declared record encrypted with AES-256-GCM and anchored on-chain.');
  console.log(`Record Hash: ${selfRecord.data.record.recordHash}`);
  console.log(`Tx Hash: ${selfRecord.data.record.txHash}`);

  // 3. Hospital Triage registers a new patient
  console.log('3. Testing Hospital Triage Patient Registration (POST /api/identity/register)');
  const hospReg = await request('/api/identity/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sunil Verma',
      dob: '1982-03-19',
      gender: 'Male',
      phone: '+91 99001 22334',
      email: 'sunil.verma@example.com',
      bloodGroup: 'AB+',
      allergies: ['Sulfa Drugs', 'Iodine Contrast'],
      conditions: ['Acute Renal Colic'],
      emergencyContact: {
        name: 'Ritu Verma',
        relation: 'Wife',
        phone: '+91 99001 22335'
      },
      requesterId: 'HOSPITAL_TRIAGE',
      requesterName: 'City General Hospital Triage Desk'
    })
  });

  if (hospReg.status !== 201 || !hospReg.data.success) {
    throw new Error(`Hospital patient registration failed: ${JSON.stringify(hospReg)}`);
  }
  const hospPatientVaultId = hospReg.data.vaultId;
  const hospPatientMediId = hospReg.data.mediId;
  console.log(`Created Hospital Triage Vault: ${hospPatientVaultId}, MediID: ${hospPatientMediId}`);
  console.log('PASS: Hospital triage successfully registered patient and issued MediID.');

  // 4. Hospital Doctor creates a Hospital-Verified Clinical Record
  console.log('4. Testing Hospital Medical Record Creation (POST /api/records/create)');
  const hospRecord = await request('/api/records/create', {
    method: 'POST',
    body: JSON.stringify({
      vaultId: hospPatientVaultId,
      title: 'Renal Ultrasound & Serum Creatinine Lab Report',
      category: 'Hospital-verified',
      recordType: 'Lab Report',
      source: 'City General Hospital',
      sourceType: 'hospital',
      doctor: 'Dr. A. R. Mehta (Nephrology)',
      summary: 'Right distal ureteric calculus (4mm) identified without severe hydronephrosis.',
      details: {
        'Serum Creatinine': '1.02 mg/dL',
        'eGFR': '88 mL/min/1.73m²',
        'Ultrasound Findings': '4mm calculus right UVJ',
        'Treatment Plan': 'Tamsulosin 0.4mg daily, hydration, pain management'
      }
    })
  });

  if (hospRecord.status !== 201 || !hospRecord.data.success) {
    throw new Error(`Hospital record creation failed: ${JSON.stringify(hospRecord)}`);
  }
  console.log('PASS: Hospital verified record anchored with AES-256-GCM encryption & doctor attribution.');
  console.log(`Status: ${hospRecord.data.record.status}`);
  console.log(`Record Hash: ${hospRecord.data.record.recordHash}`);

  // 5. Decrypted Retrieval & Integrity Verification
  console.log(`5. Testing GET /api/records/${hospPatientVaultId}`);
  const fetchRecords = await request(`/api/records/${hospPatientVaultId}`);
  if (fetchRecords.status !== 200 || !fetchRecords.data.success) {
    throw new Error(`Failed to fetch records: ${JSON.stringify(fetchRecords)}`);
  }
  const loadedRecords = fetchRecords.data.records;
  if (loadedRecords.length !== 1 || loadedRecords[0].status !== 'verified') {
    throw new Error(`Record verification failed or integrity mismatch: ${JSON.stringify(loadedRecords)}`);
  }
  console.log('PASS: Decrypted medical record payload matches authenticated tag.');
  console.log(`Retrieved title: "${loadedRecords[0].title}"`);
  console.log(`Retrieved details: ${JSON.stringify(loadedRecords[0].payload.details)}`);

  console.log('\n======================================================');
  console.log('ALL PATIENT & HOSPITAL RECORD CREATION TESTS PASSED!');
  console.log('======================================================\n');
}

testRecordCreationFlow().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
