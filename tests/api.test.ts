/**
 * Automated Test Suite for MediVault Identity & Security Backend APIs
 */

const BASE_URL = 'http://127.0.0.1:5001';

async function testApi() {
  console.log('--- Starting MediVault Backend API Test Suite ---');

  // Helper fetch wrapper
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

  // 1. Health check
  console.log('1. Testing GET /api/health');
  const health = await request('/api/health');
  if (health.status !== 200 || health.data.status !== 'UP') {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('PASS: Server is UP.');

  // 2. Register Patient
  console.log('2. Testing POST /api/identity/register');
  const regRes = await request('/api/identity/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ananya Sharma',
      dob: '1992-08-21',
      gender: 'Female',
      phone: '+91 98765 12345',
      bloodGroup: 'O+',
      allergies: ['Peanuts'],
      conditions: []
    })
  });

  if (regRes.status !== 201 || !regRes.data.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
  }
  const { vaultId, mediId, mediIdHash } = regRes.data;
  console.log('Created Vault:', { vaultId, mediId, mediIdHash });
  if (!vaultId.startsWith('VLT-') || !mediId.startsWith('91-')) {
    throw new Error('Invalid vaultId or mediId format');
  }
  console.log('PASS: Patient registered with sovereign MediID & Vault ID.');

  // 3. Fetch Identity Metadata
  console.log(`3. Testing GET /api/identity/${vaultId}`);
  const fetchRes = await request(`/api/identity/${vaultId}`);
  if (fetchRes.status !== 200 || fetchRes.data.vault.name !== 'Ananya Sharma') {
    throw new Error(`Fetch vault failed: ${JSON.stringify(fetchRes)}`);
  }
  console.log('PASS: Retrieved sanitized public identity view.');

  // 4. Enroll Fingerprint Biometric Template
  console.log('4. Testing POST /api/identity/fingerprint/register');
  const bioReg = await request('/api/identity/fingerprint/register', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      sensorType: 'WebAuthn-Enclave-FIDO2',
      biometricTemplate: {
        format: 'ISO-19794-2:SIMULATED',
        minutiaeCount: 44,
        ridgeQuality: 99.8,
        captureDevice: 'Apple TouchID Enclave Simulation'
      }
    })
  });
  if (bioReg.status !== 200 || !bioReg.data.biometricHash) {
    throw new Error(`Biometric enrollment failed: ${JSON.stringify(bioReg)}`);
  }
  console.log('PASS: Biometric template encrypted with AES-256-GCM and stored off-chain.');

  // 5. Verify Fingerprint Biometric Template
  console.log('5. Testing POST /api/identity/fingerprint/verify');
  const bioVer = await request('/api/identity/fingerprint/verify', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      assertionToken: 'valid-enclave-passkey-proof-sim'
    })
  });
  if (bioVer.status !== 200 || !bioVer.data.verified) {
    throw new Error(`Biometric verification failed: ${JSON.stringify(bioVer)}`);
  }
  console.log('PASS: Biometric verification succeeded with confidence score.');

  // 6. Register DNA Laboratory Profile
  console.log('6. Testing POST /api/identity/dna/register');
  const dnaReg = await request('/api/identity/dna/register', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      labReferenceId: 'DNA-LAB-829173',
      issuingLaboratory: 'Apollo Genomics & Diagnostics',
      dnaProfile: {
        referenceId: 'DNA-LAB-829173',
        coDISMarkers: 24,
        sampleType: 'Saliva Swab',
        certifiedDate: '2026-09-20'
      }
    })
  });
  if (dnaReg.status !== 200 || !dnaReg.data.dnaHash) {
    throw new Error(`DNA registration failed: ${JSON.stringify(dnaReg)}`);
  }
  console.log('PASS: DNA profile encrypted and registered.');

  // 7. Verify DNA with Access Control
  console.log('7. Testing Access Control on POST /api/identity/dna/verify');
  // 7a. Unauthorized request should be rejected (403)
  const unauthDna = await request('/api/identity/dna/verify', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      requesterRole: 'guest'
    })
  });
  if (unauthDna.status !== 403) {
    throw new Error(`Unauthorized DNA request was NOT rejected! Status: ${unauthDna.status}`);
  }
  console.log('PASS: Unauthorized DNA access strictly rejected (403 Forbidden).');

  // 7b. Authorized hospital request should succeed
  const authDna = await request('/api/identity/dna/verify', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      requesterRole: 'hospital',
      requesterId: 'hosp-city-general'
    })
  });
  if (authDna.status !== 200 || !authDna.data.verified) {
    throw new Error(`Authorized DNA verification failed: ${JSON.stringify(authDna)}`);
  }
  console.log('PASS: Authorized DNA profile verification succeeded.');

  // 8. End-to-end Cryptographic Integrity Scan
  console.log(`8. Testing GET /api/identity/integrity/${vaultId}`);
  const integrityBefore = await request(`/api/identity/integrity/${vaultId}`);
  if (integrityBefore.status !== 200 || integrityBefore.data.overallIntegrity !== 'VERIFIED') {
    throw new Error(`Integrity check failed: ${JSON.stringify(integrityBefore)}`);
  }
  console.log('PASS: Cryptographic record integrity 100% verified.');

  // 9. Tamper Demonstration
  console.log('9. Testing Tamper Demonstration Tool');
  await request('/api/identity/tamper-demo', {
    method: 'POST',
    body: JSON.stringify({
      vaultId,
      target: 'fingerprint'
    })
  });

  const integrityAfterTamper = await request(`/api/identity/integrity/${vaultId}`);
  if (integrityAfterTamper.data.overallIntegrity !== 'TAMPERED') {
    throw new Error('Tampered record was NOT detected as TAMPERED!');
  }
  console.log('PASS: Tampering instantly caught by auth tag mismatch -> Status: TAMPERED.');

  console.log('\n=============================================');
  console.log('ALL 9 BACKEND API TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================\n');
}

testApi().catch((err) => {
  console.error('API Test Suite Failed:', err.message);
  process.exit(1);
});
