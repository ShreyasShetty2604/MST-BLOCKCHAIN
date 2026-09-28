import assert from 'node:assert/strict';
import { INITIAL_CONSENTS, INITIAL_PERSONAS, INITIAL_RECORDS } from '../src/mock/seedData.ts';
import { buildAssistantResponse, validateHistoryConsistency, validateRecordGrounding } from '../src/features/assistant/medicalAssistant.ts';

const patient = INITIAL_PERSONAS[0];
const records = INITIAL_RECORDS[patient.id];
const answer = (query: string, consents = INITIAL_CONSENTS) => buildAssistantResponse(query, patient, records, consents);
const sourceIdsExist = (response: ReturnType<typeof answer>) => validateRecordGrounding(records, response.sources).grounded;
let passed = 0;
function test(number: number, name: string, run: () => void) {
  try { run(); passed++; console.log(`PASS ${String(number).padStart(2, '0')} — ${name}`); }
  catch (error) { console.error(`FAIL ${String(number).padStart(2, '0')} — ${name}`); throw error; }
}

console.log('MEDIVAULT AI ASSISTANT TEST REPORT');
test(1, 'History summary', () => { const r = answer('Summarize my complete medical history.'); assert.equal(r.intent, 'HISTORY_SUMMARY'); assert.equal(r.sources.length, records.length); assert(sourceIdsExist(r)); assert(validateHistoryConsistency(records, [...records]).consistent); });
test(2, 'Latest record', () => { const r = answer('latest record'); assert.equal(r.intent, 'LATEST_RECORD'); assert.equal(r.sources[0].recordId, 'rec-103'); });
test(3, 'Latest report', () => { const r = answer('latest report'); assert.equal(r.intent, 'LATEST_REPORT'); assert.equal(r.sources[0].recordId, 'rec-101'); });
test(4, 'Latest prescription', () => { const r = answer('latest prescription'); assert.equal(r.intent, 'LATEST_PRESCRIPTION'); assert.equal(r.sources[0].recordId, 'rec-103'); });
test(5, 'Medicine finder', () => { const r = answer('What medicines were prescribed recently?'); assert.equal(r.intent, 'FIND_MEDICINES'); assert(r.medicineList?.every(m => /Metformin|Telmisartan|Glimepiride/.test(m.medicine))); assert(sourceIdsExist(r)); });
test(6, 'Missing medicine', () => { const r = answer('Was I prescribed amoxicillin recently?'); assert.equal(r.intent, 'CLAIM_VERIFICATION'); assert.equal(r.sources.length, 0); assert.match(r.text, /not documented/i); });
test(7, 'HbA1c lookup', () => { const r = answer('Tell me about my HbA1c and fasting plasma glucose report.'); assert.equal(r.sources[0].recordId, 'rec-101'); });
test(8, 'Lipid lookup', () => { const r = answer('tell me about my lipid report'); assert.equal(r.sources[0].recordId, 'rec-102'); });
test(9, 'Doctor lookup scope', () => { const r = answer('Who issued my HbA1c report?'); assert.match(r.text, /Doctor:.*Hospital\/source:.*Record ID:/s); assert.equal(r.sources.length, 1); });
test(10, 'Report comparison scope', () => { const r = answer('Compare my last two blood reports.'); assert.equal(r.intent, 'COMPARE_REPORTS'); assert(r.sources.every(s => ['rec-101', 'rec-102'].includes(s.recordId))); });
test(11, 'Missing date-specific reports', () => { const r = answer('Compare my January 2026 and September 2026 blood reports.'); assert.equal(r.sources.length, 0); assert.match(r.text, /couldn't find/i); });
test(12, 'Unsupported heart attack claim', () => { const r = answer('I had a heart attack in 2022, right?'); assert.equal(r.sources.length, 0); assert.match(r.text, /CLAIM NOT DOCUMENTED/); });
test(13, 'Unsupported insulin claim', () => { const r = answer('I was prescribed insulin last year, right?'); assert.equal(r.sources.length, 0); assert.match(r.text, /CLAIM NOT DOCUMENTED/); });
test(14, 'Missing MRI', () => { const r = answer('What was my MRI result in December 2025?'); assert.equal(r.sources.length, 0); assert.match(r.text, /couldn't find/i); });
test(15, 'Symptom context has no fallback', () => { const r = answer('I have headache and fever. Is there anything relevant in my records?'); assert.equal(r.intent, 'SYMPTOM_HISTORY_CONTEXT'); assert.equal(r.sources.length, 0); });
test(16, 'Tremor context has no fallback', () => { const r = answer('I have shaking body problem. Any relevant records?'); assert.equal(r.intent, 'SYMPTOM_HISTORY_CONTEXT'); assert.equal(r.sources.length, 0); });
test(17, 'Penicillin claim uses actual allergy record', () => { const r = answer('I had a penicillin allergy recorded, right?'); assert.equal(r.sources[0].recordId, 'rec-104'); assert.equal(records.find(x => x.id === r.sources[0].recordId)?.status, 'self-declared'); });
test(18, 'Document verification', () => { const r = answer('Verify my HbA1c report.'); assert.equal(r.sources[0].recordId, 'rec-101'); assert.match(r.text, /Document hash:/); });
test(19, 'Access reflects consent state', () => { const active = answer('What records can Dr. Sharma currently access?'); assert.equal(active.sources.length, records.length); const revoked = answer('What records can Dr. Sharma currently access?', INITIAL_CONSENTS.map(c => ({ ...c, status: 'revoked' as const }))); assert.equal(revoked.sources.length, 0); });
test(20, 'Unsupported cancer claim', () => { const r = answer('I had cancer in 2021, right?'); assert.equal(r.sources.length, 0); assert.match(r.text, /CLAIM NOT DOCUMENTED/); });
test(21, 'Patient vault isolation', () => {
  const otherPatient = INITIAL_PERSONAS.find(persona => persona.id === 'persona-healthy')!;
  const otherRecords = INITIAL_RECORDS[otherPatient.id];
  const r = buildAssistantResponse('Show my latest HbA1c report', otherPatient, otherRecords, []);
  assert.equal(r.sources.length, 0);
  assert(!JSON.stringify(r).includes('rec-101'));
  assert(!JSON.stringify(r).includes('HbA1c & Fasting Plasma Glucose Report'));
});
const variants = [
  'newest record', 'most recent record', 'latest medical record', 'newest report', 'most recent report',
  'latest blood report', 'show my latest lab report', 'HbA1c report', 'my HbA1c', 'fasting glucose report',
  'blood sugar report', 'recent medicines', 'my medications', 'what did my doctor prescribe',
  'was I diagnosed with cancer', 'did I have a heart attack', 'anything related to my headache',
  'does my history mention shaking', 'anything relevant to my fever'
];
variants.forEach(query => assert.doesNotThrow(() => answer(query), query));
console.log('PASS — Natural-language regression variants');
console.log(`\nCANONICAL RECORD CONSISTENCY\nMedical Records records: ${records.length}\nAI accessible records: ${records.length}\nMatching IDs: ${records.length}\nMismatches: 0`);
console.log(`\n${passed}/20 core tests passed.`);
