import { generateMediID, validateMediID, hashMediID } from '../src/lib/mediId.ts';

console.log('--- Testing MediID Generator and Validator ---');

// 1. Test generation
const id1 = generateMediID();
console.log('Generated ID 1:', id1);
const val1 = validateMediID(id1);
console.log('ID 1 Validation:', val1);
if (!val1.valid) {
  console.error('FAILED: Generated ID 1 failed validation!');
  process.exit(1);
}

// 2. Test batch generation (100 random IDs must all be valid)
let allValid = true;
for (let i = 0; i < 100; i++) {
  const testId = generateMediID();
  const res = validateMediID(testId);
  if (!res.valid) {
    console.error(`FAILED: Batch ID ${testId} invalid:`, res.reason);
    allValid = false;
    break;
  }
}
if (!allValid) process.exit(1);
console.log('PASS: 100 randomly generated MediIDs all passed Luhn checksum.');

// 3. Test tamper detection (flip last digit)
const rawDigits = id1.replace(/[\s-]/g, '');
const lastDigit = parseInt(rawDigits.slice(-1), 10);
const tamperedLast = (lastDigit + 1) % 10;
const tamperedId = rawDigits.slice(0, 13) + tamperedLast.toString();
const tamperedVal = validateMediID(tamperedId);
console.log('Tampered Checksum Test (Should be invalid):', tamperedVal);
if (tamperedVal.valid) {
  console.error('FAILED: Tampered ID passed validation when it should have failed!');
  process.exit(1);
}
console.log('PASS: Tampered check digit correctly detected.');

// 4. Test prefix detection
const invalidPrefix = '81' + rawDigits.slice(2);
const invalidPrefixVal = validateMediID(invalidPrefix);
console.log('Invalid Prefix Test (Should be invalid):', invalidPrefixVal);
if (invalidPrefixVal.valid) {
  console.error('FAILED: Invalid prefix passed validation!');
  process.exit(1);
}
console.log('PASS: Non-91 prefix correctly detected.');

// 5. Test hashing
const hash1 = hashMediID(id1);
const hash2 = hashMediID(id1);
console.log('MediID Hash:', hash1);
if (!hash1.startsWith('0x') || hash1.length !== 66) {
  console.error('FAILED: Hash is not 0x + 64 hex characters');
  process.exit(1);
}
if (hash1 !== hash2) {
  console.error('FAILED: Hashing is not deterministic');
  process.exit(1);
}
console.log('PASS: Deterministic salted hash produced.');

console.log('ALL MEDIID TESTS PASSED SUCCESSFULLY!');
