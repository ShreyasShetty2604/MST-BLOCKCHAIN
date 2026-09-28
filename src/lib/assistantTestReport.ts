/**
 * Development-only smoke tests for the grounded retrieval layer.
 * Run from the browser console or import into a demo diagnostics view.
 */
import { findSupportingRecordsForClaim, getPatientRecords, getPrescriptionRecords, searchMedicalRecords, validateMedicalDataConsistency } from '../data/patientRecords';

type Check = { name: string; passed: boolean; detail: string };

export function runMediVaultAssistantTests(): string {
  const latest = [...getPatientRecords()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))[0];
  const latestPrescription = [...getPrescriptionRecords()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))[0];
  const lookup = (query: string, expected: string) => {
    const actual = searchMedicalRecords(query)[0]?.id;
    return { name: query, passed: actual === expected, detail: actual ? `Expected ${expected}; received ${actual}` : `Expected ${expected}; no record returned` };
  };
  const checks: Check[] = [
    { name: 'Full history', passed: getPatientRecords().length > 0, detail: `${getPatientRecords().length} canonical records available` },
    { name: 'Latest record', passed: Boolean(latest), detail: latest ? latest.id : 'No canonical record' },
    { name: 'Latest prescription', passed: Boolean(latestPrescription), detail: latestPrescription ? latestPrescription.id : 'No canonical prescription' },
    lookup('HbA1c and fasting plasma glucose report', 'MR-001'),
    lookup('my fasting blood sugar report', 'MR-001'),
    lookup('my lipid profile', 'MR-002'),
    lookup('my penicillin allergy record', 'MR-004'),
    lookup('my ophthalmology report', 'MR-006'),
    { name: 'No fabricated MRI record', passed: searchMedicalRecords('December 2025 MRI').length === 0, detail: 'MRI retrieval returned no canonical record' },
    { name: 'Unsupported heart-attack claim has no evidence', passed: findSupportingRecordsForClaim('I had a heart attack in 2022, right?').length === 0, detail: 'No unrelated fallback record returned' },
    { name: 'Unsupported insulin claim has no evidence', passed: findSupportingRecordsForClaim('I was prescribed insulin last year, right?').length === 0, detail: 'No unrelated prescription returned' },
    { name: 'Supported penicillin claim', passed: findSupportingRecordsForClaim('I had a penicillin allergy recorded, right?')[0]?.id === 'MR-004', detail: 'Direct self-declared allergy evidence is MR-004' },
    { name: 'Supported ophthalmology claim', passed: findSupportingRecordsForClaim('I had my ophthalmology evaluation in April 2026, right?')[0]?.id === 'MR-006', detail: 'Direct evidence is MR-006' },
    { name: 'Dataset consistency', passed: validateMedicalDataConsistency().valid, detail: 'AI and verification IDs resolve to canonical records' },
  ];
  const lines = ['MEDIVAULT AI ASSISTANT TEST REPORT', ''];
  checks.forEach((check, index) => lines.push(`${check.passed ? 'PASS' : 'FAIL'}  ${index + 1}. ${check.name} — ${check.detail}`));
  return lines.join('\n');
}
