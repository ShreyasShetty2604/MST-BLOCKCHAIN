/**
 * QR Code & Optical Camera Scanner Resolution Test Suite
 */

import { db } from '../server/db.ts';

async function runQrScannerTests() {
  console.log('--- Testing MediVault QR Code & Optical Scanner Database Integration ---');

  await db.init();

  // 1. Test direct database lookup by Vault ID
  const vaultById = db.getVaultByIdOrMediId('VLT-8F29A31B72C1');
  if (!vaultById || vaultById.name !== 'Rajesh Kumar') {
    throw new Error('Failed to find seeded patient by Vault ID: VLT-8F29A31B72C1');
  }
  console.log('PASS: Direct Vault ID database resolution verified.');

  // 2. Test database lookup by 14-digit MediID
  const vaultByMediId = db.getVaultByIdOrMediId('91-4827-6153-2043');
  if (!vaultByMediId || vaultByMediId.vaultId !== 'VLT-8F29A31B72C1') {
    throw new Error('Failed to find seeded patient by hyphenated MediID');
  }
  console.log('PASS: Hyphenated MediID database resolution verified.');

  // 3. Test unhyphenated MediID lookup
  const vaultByRawMediId = db.getVaultByIdOrMediId('91482761532043');
  if (!vaultByRawMediId || vaultByRawMediId.vaultId !== 'VLT-8F29A31B72C1') {
    throw new Error('Failed to find seeded patient by unhyphenated raw MediID');
  }
  console.log('PASS: Raw unhyphenated MediID database resolution verified.');

  // 4. Test URL payload parsing
  const testUrl = 'https://medivault.id/vault/VLT-8F29A31B72C1?mediId=91-4827-6153-2043';
  const urlMatch = testUrl.match(/vault\/(VLT-[A-F0-9]{12})/i);
  if (!urlMatch || urlMatch[1] !== 'VLT-8F29A31B72C1') {
    throw new Error('Failed to extract Vault ID from opaque URL');
  }
  const resolvedFromUrl = db.getVaultByIdOrMediId(urlMatch[1]);
  if (!resolvedFromUrl) {
    throw new Error('Could not resolve patient from extracted URL Vault ID');
  }
  console.log('PASS: QR URL payload parsing and database resolution verified.');

  // 5. Test JSON Passport parsing
  const testJson = JSON.stringify({
    protocol: 'medivault-v1',
    vaultId: 'VLT-8F29A31B72C1',
    mediId: '91-4827-6153-2043',
    name: 'Rajesh Kumar',
    blood: 'B+'
  });
  const parsed = JSON.parse(testJson);
  const resolvedFromJson = db.getVaultByIdOrMediId(parsed.vaultId);
  if (!resolvedFromJson || resolvedFromJson.bloodGroup !== 'B+') {
    throw new Error('Failed to resolve patient from JSON passport payload');
  }
  console.log('PASS: QR JSON passport parsing and database resolution verified.');

  // 6. Test Audit Log creation for optical camera scan
  db.logAccess({
    id: `log-test-${Date.now()}`,
    vaultId: 'VLT-8F29A31B72C1',
    requesterId: 'HOSPITAL_CAMERA_SCAN',
    requesterName: 'City General Triage Desk',
    resourceType: 'identity',
    action: 'QR_CAMERA_SCAN',
    granted: true,
    reason: 'Optical QR Camera Scan authentication and record lookup',
    timestamp: new Date().toISOString()
  });

  const logs = db.getAccessLogs('VLT-8F29A31B72C1');
  const scanLog = logs.find((l) => l.action === 'QR_CAMERA_SCAN');
  if (!scanLog) {
    throw new Error('Access audit log was not persisted for QR scan');
  }
  console.log('PASS: Audit log entry for QR_CAMERA_SCAN successfully recorded.');

  console.log('ALL QR RESOLUTION & DATABASE TESTS PASSED SUCCESSFULLY!');
}

runQrScannerTests().catch((err) => {
  console.error('Test Suite Failed:', err.message);
  process.exit(1);
});
