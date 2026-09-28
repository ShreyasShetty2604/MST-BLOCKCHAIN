import {
  generateVaultId,
  encryptData,
  decryptData,
  hashData,
  verifyHash
} from '../src/lib/crypto.ts';

async function runTests() {
  console.log('--- Testing MediVault Cryptographic Abstraction ---');

  // 1. Vault ID Generation Test
  const vaultId = generateVaultId();
  console.log('Generated Vault ID:', vaultId);
  if (!/^VLT-[0-9A-F]{12}$/.test(vaultId)) {
    console.error('FAILED: Vault ID does not match expected VLT-XXXXXXXXXXXX format');
    process.exit(1);
  }
  console.log('PASS: Vault ID format matches VLT-XXXXXXXXXXXX.');

  // 2. Encryption & Decryption Roundtrip Test (Biometric / DNA Simulation)
  const sampleBiometricTemplate = JSON.stringify({
    templateVersion: 'ISO-19794-2:2005-SIM',
    minutiaeCount: 42,
    ridgeQualityScore: 98.4,
    sensorModel: 'HardwareEnclave-Virtual-V2',
    registeredAt: '2026-09-28T16:45:00Z'
  });

  const encrypted = await encryptData(sampleBiometricTemplate);
  console.log('Encrypted Payload:', {
    ciphertextLength: encrypted.ciphertext.length,
    iv: encrypted.iv,
    tag: encrypted.tag,
    algorithm: encrypted.algorithm
  });

  if (encrypted.ciphertext.includes('minutiaeCount') || encrypted.ciphertext.includes('ISO-19794')) {
    console.error('FAILED: Plaintext leaked into ciphertext!');
    process.exit(1);
  }
  console.log('PASS: Ciphertext does not leak plaintext content.');

  const decrypted = await decryptData(encrypted);
  if (decrypted !== sampleBiometricTemplate) {
    console.error('FAILED: Decrypted text does not match original plaintext!');
    process.exit(1);
  }
  console.log('PASS: AES-256-GCM encryption & decryption roundtrip succeeded.');

  // 3. Tamper Resistance Test: Alter 1 character of ciphertext
  const tamperedCiphertext =
    encrypted.ciphertext.slice(0, 10) +
    (encrypted.ciphertext[10] === 'a' ? 'b' : 'a') +
    encrypted.ciphertext.slice(11);

  let tamperDetected = false;
  try {
    await decryptData({
      ...encrypted,
      ciphertext: tamperedCiphertext
    });
  } catch (err: any) {
    tamperDetected = true;
    console.log('Tamper Check Caught Expected Error:', err.message);
  }

  if (!tamperDetected) {
    console.error('FAILED: Tampered ciphertext was accepted without error!');
    process.exit(1);
  }
  console.log('PASS: Tampered ciphertext immediately rejected by AES-256-GCM auth tag.');

  // 4. Hashing & Verification Test
  const sampleDnaRecord = {
    laboratoryId: 'LAB-IND-BLR-09',
    referenceId: 'DNA-REF-91823741',
    lociMarkersCount: 24,
    certifiedDate: '2026-08-15'
  };

  const dnaHash = await hashData(sampleDnaRecord);
  console.log('DNA Record Hash:', dnaHash);
  if (!dnaHash.startsWith('0x') || dnaHash.length !== 66) {
    console.error('FAILED: Hash output is not 0x + 64 hex characters');
    process.exit(1);
  }

  const isValid = await verifyHash(sampleDnaRecord, dnaHash);
  if (!isValid) {
    console.error('FAILED: Valid hash was reported invalid');
    process.exit(1);
  }
  console.log('PASS: Hash verification validated authentic record.');

  const isTamperedDna = await verifyHash(
    { ...sampleDnaRecord, referenceId: 'DNA-REF-00000000' },
    dnaHash
  );
  if (isTamperedDna) {
    console.error('FAILED: Tampered DNA record matched original hash!');
    process.exit(1);
  }
  console.log('PASS: Tampered DNA record correctly flagged as hash mismatch.');

  console.log('ALL CRYPTO TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
