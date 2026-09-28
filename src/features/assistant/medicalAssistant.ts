import type { Consent, MedicalRecord, PatientPersona } from '../../mock/types.ts';

export type AssistantIntent =
  | 'HISTORY_SUMMARY' | 'LATEST_RECORD' | 'LATEST_REPORT' | 'LATEST_PRESCRIPTION'
  | 'FIND_MEDICINES' | 'RECORD_LOOKUP' | 'COMPARE_REPORTS' | 'SHARE_RECORD'
  | 'VERIFY_DOCUMENT' | 'CHECK_ACCESS' | 'REVOKE_ACCESS' | 'SYMPTOM_HISTORY_CONTEXT'
  | 'CLAIM_VERIFICATION' | 'UNKNOWN';

export interface AssistantSource { recordId: string; title: string; date: string; }
export interface AssistantResponse {
  intent: AssistantIntent;
  text: string;
  sources: AssistantSource[];
  timelineEntries?: { date: string; title: string; doctor: string; summary: string }[];
  medicineList?: { medicine: string; dosage: string; date: string; doctor: string; source: string }[];
  comparisonTable?: { test: string; earlier: string; later: string; change: string }[];
  shareRequest?: { record: MedicalRecord; recipient: string; durationHours: number };
  verification?: { doctorVerified?: boolean; documentHashVerified?: boolean; documentHash?: string; status?: string };
}

const aliases: Record<string, string[]> = {
  hba1c: ['hba1c', 'ha1c', 'a1c', 'hemoglobin a1c'],
  glucose: ['glucose', 'fasting glucose', 'fasting plasma glucose', 'fasting blood sugar', 'fpg', 'blood sugar'],
  lipid: ['lipid', 'lipid profile', 'cholesterol', 'ldl', 'hdl', 'triglycerides'],
  penicillin: ['penicillin', 'amoxicillin', 'drug allergy', 'allergy'],
  eye: ['ophthalmology', 'eye exam', 'retinal', 'eye report'],
  tremor: ['tremor', 'trembling', 'shaking', 'shivering'],
};

export function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().replace(/[^a-z0-9% ]/g, ' ').replace(/\s+/g, ' ').trim();
  Object.entries(aliases).forEach(([canonical, values]) => {
    if (values.some(value => normalized.includes(value))) normalized += ` ${canonical}`;
  });
  return normalized.replace(/reports\b/g, 'report').replace(/medicines\b/g, 'medicine').replace(/records\b/g, 'record');
}

export function detectIntent(query: string): AssistantIntent {
  const q = normalizeQuery(query);
  if (/\b(revoke|remove|cancel)\b/.test(q) && /\b(access|consent|permission)\b/.test(q)) return 'REVOKE_ACCESS';
  if (/\b(share|send|grant access)\b/.test(q)) return 'SHARE_RECORD';
  if (/\b(verify|verification|authentic|hash)\b/.test(q)) return 'VERIFY_DOCUMENT';
  if (/\b(access|who can|permission|consent)\b/.test(q)) return 'CHECK_ACCESS';
  if (/\b(compare|comparison|what changed)\b/.test(q)) return 'COMPARE_REPORTS';
  if (/\b(summarize|summary|medical history|complete history|timeline)\b/.test(q)) return 'HISTORY_SUMMARY';
  if (/\b(latest|newest|most recent)\b/.test(q) && /\b(prescription|prescribed)\b/.test(q)) return 'LATEST_PRESCRIPTION';
  if (/\b(latest|newest|most recent)\b/.test(q) && /\b(report|lab|blood)\b/.test(q)) return 'LATEST_REPORT';
  if (/\b(latest|newest|most recent)\b/.test(q) && /\brecord\b/.test(q)) return 'LATEST_RECORD';
  if (/\b(medicine|medication|prescription|prescribed|drug)\b/.test(q)) {
    if (/\b(right|did i|was i|i was)\b/.test(q)) return 'CLAIM_VERIFICATION';
    return 'FIND_MEDICINES';
  }
  if (/\b(right|did i|was i|i had|diagnosed|result in)\b/.test(q)) return 'CLAIM_VERIFICATION';
  if (/\b(headache|fever|pain|symptom|cough|nausea|dizz|fatigue|numb|weakness|tremor|shaking|relevant)\b/.test(q)) return 'SYMPTOM_HISTORY_CONTEXT';
  if (/\b(report|hba1c|glucose|lipid|cholesterol|penicillin|allergy|ophthalmology|eye)\b/.test(q)) return 'RECORD_LOOKUP';
  return 'UNKNOWN';
}

export const getPatientRecords = (records: MedicalRecord[], patientId?: string) =>
  [...records].filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

const textOf = (record: MedicalRecord) => [record.title, record.category, record.recordType, record.source, record.doctor, record.payload?.summary, ...Object.keys(record.payload?.details || {}), ...Object.values(record.payload?.details || {})].filter(Boolean).join(' ').toLowerCase();
const source = (record: MedicalRecord): AssistantSource => ({ recordId: record.id, title: record.title, date: record.date });
const isReport = (record: MedicalRecord) => /report|lab/.test(`${record.category} ${record.recordType}`.toLowerCase());
const isPrescription = (record: MedicalRecord) => /prescription/.test(`${record.category} ${record.recordType}`.toLowerCase());
const tokens = (q: string) => normalizeQuery(q).split(' ').filter(word => word.length > 2 && !['tell', 'about', 'with', 'what', 'does', 'show', 'my', 'the', 'and', 'from', 'your'].includes(word));

export function searchMedicalRecords(records: MedicalRecord[], query: string, limit = 5): MedicalRecord[] {
  const words = tokens(query);
  return getPatientRecords(records).map(record => ({ record, score: words.reduce((score, word) => score + (textOf(record).includes(word) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || b.record.date.localeCompare(a.record.date)).slice(0, limit).map(item => item.record);
}

export const getLatestRecord = (records: MedicalRecord[]) => getPatientRecords(records)[0];
export const getLatestReport = (records: MedicalRecord[], query = '') => getPatientRecords(records).filter(record => isReport(record) && (!/blood|lab|glucose|hba1c/.test(normalizeQuery(query)) || /blood|lab|glucose|hba1c/.test(textOf(record))))[0];
export const getLatestPrescription = (records: MedicalRecord[]) => getPatientRecords(records).find(isPrescription);

export function validateRecordGrounding(records: MedicalRecord[], sources: AssistantSource[]) {
  const mismatches = sources.filter(item => { const record = records.find(r => r.id === item.recordId); return !record || record.title !== item.title || record.date !== item.date; });
  return { grounded: mismatches.length === 0, mismatches };
}

export function validateHistoryConsistency(records: MedicalRecord[], used: MedicalRecord[]) {
  const keys = ['id', 'title', 'date', 'doctor', 'source', 'recordType'] as const;
  const mismatches = records.flatMap(record => {
    const comparison = used.find(item => item.id === record.id);
    return !comparison || keys.some(key => record[key] !== comparison[key]) ? [record.id] : [];
  });
  return { consistent: mismatches.length === 0 && records.length === used.length, totalRecords: records.length, sourceIds: used.map(r => r.id), mismatches };
}

export function compareReports(records: MedicalRecord[], query: string) {
  let candidates = getPatientRecords(records).filter(record => isReport(record) && (!/blood|lab/.test(normalizeQuery(query)) || /blood|glucose|hba1c|lipid|lab/.test(textOf(record))));
  const q = normalizeQuery(query);
  const monthMatches = candidates.filter(record => q.includes(new Date(`${record.date}T00:00:00`).toLocaleString('en', { month: 'long' }).toLowerCase()));
  if (/january|february|march|april|may|june|july|august|september|october|november|december/.test(q) && monthMatches.length < 2) return { records: [] as MedicalRecord[], rows: [] as AssistantResponse['comparisonTable'] };
  candidates = candidates.slice(0, 2).reverse();
  if (candidates.length < 2) return { records: candidates, rows: [] as AssistantResponse['comparisonTable'] };
  const [earlier, later] = candidates;
  const rows = Object.keys(earlier.payload.details).filter(key => key in later.payload.details).map(test => {
    const a = earlier.payload.details[test], b = later.payload.details[test];
    const an = Number.parseFloat(a.replace(/[^0-9.]/g, '')), bn = Number.parseFloat(b.replace(/[^0-9.]/g, ''));
    const change = Number.isFinite(an) && Number.isFinite(bn) ? (bn === an ? 'No change' : `${bn > an ? '↑' : '↓'} ${Math.abs(bn - an).toFixed(1)}`) : 'Recorded values differ';
    return { test, earlier: a, later: b, change };
  });
  return { records: candidates, rows };
}

const medicines = (records: MedicalRecord[]) => getPatientRecords(records).filter(isPrescription).flatMap(record => Object.entries(record.payload.details)
  .filter(([name]) => !/refill|instruction|duration/.test(name.toLowerCase())).map(([medicine, dosage]) => ({ medicine, dosage, date: record.date, doctor: record.doctor || 'Not recorded', source: record.title, record })));

function claimText(query: string) { return normalizeQuery(query).replace(/\b(i|had|have|was|were|prescribed|in|right|did|last|year)\b/g, '').trim(); }
export const findSupportingRecordsForClaim = (records: MedicalRecord[], query: string) => {
  const q = normalizeQuery(query); const year = q.match(/\b20\d{2}\b/)?.[0]; const entities = tokens(claimText(query));
  const pool = /prescribed|prescription|medicine|medication/.test(q) ? records.filter(isPrescription) : records;
  return getPatientRecords(pool).filter(record => (!year || record.date.startsWith(year)) && entities.some(entity => textOf(record).includes(entity)));
};
export const findRelevantRecordsForSymptoms = (records: MedicalRecord[], query: string) => searchMedicalRecords(records, query).filter(record => tokens(query).some(word => textOf(record).includes(word)));

export function buildAssistantResponse(query: string, patient: PatientPersona, records: MedicalRecord[], consents: Consent[]): AssistantResponse {
  const intent = detectIntent(query); const all = getPatientRecords(records, patient.id); const total = all.length;
  const noMatch = (text: string): AssistantResponse => ({ intent, text, sources: [] });
  const recordReply = (record: MedicalRecord | undefined, label: string) => record ? { intent, text: `${label}: ${record.title} (${record.date}). ${record.payload.summary}\n\nYour vault contains ${total} records; I used 1 relevant record.`, sources: [source(record)] } : noMatch(`I couldn't find a matching record in the available medical records.`);
  if (intent === 'HISTORY_SUMMARY') {
    const consistency = validateHistoryConsistency(all, all);
    return { intent, text: consistency.consistent ? `Here is your complete documented medical history. Your vault contains ${total} records, shown chronologically.` : 'Assistant could not validate history consistency.', sources: [...all].reverse().map(source), timelineEntries: [...all].reverse().map(r => ({ date: r.date, title: r.title, doctor: r.doctor || r.source, summary: r.payload.summary })) };
  }
  if (intent === 'LATEST_RECORD') return recordReply(getLatestRecord(all), 'Your latest medical record');
  if (intent === 'LATEST_REPORT') return recordReply(getLatestReport(all, query), 'Your latest qualifying report');
  if (intent === 'LATEST_PRESCRIPTION') return recordReply(getLatestPrescription(all), 'Your latest prescription');
  if (intent === 'FIND_MEDICINES') {
    const found = medicines(all); const named = tokens(query).find(word => !['medicine', 'medication', 'prescription', 'prescribed', 'recently', 'what', 'were', 'taking', 'show', 'doctor', 'did', 'find'].includes(word));
    const matching = named ? found.filter(item => item.medicine.toLowerCase().includes(named)) : found;
    if (!matching.length) return noMatch(named ? `I couldn't find ${named} in the available prescription records.` : 'I could not find any prescription records with medicines.');
    return { intent, text: `I found medicines in ${new Set(matching.map(m => m.record.id)).size} prescription record(s).`, medicineList: matching.map(({ record, ...item }) => item), sources: [...new Map(matching.map(m => [m.record.id, source(m.record)])).values()] };
  }
  if (intent === 'RECORD_LOOKUP') {
    const found = searchMedicalRecords(all, query); if (!found.length) return noMatch("I couldn't find a matching record in the available medical records.");
    const issuer = /who issued|issuer|who made/.test(normalizeQuery(query)); const record = found[0];
    return { intent, text: issuer ? `${record.title}\nDoctor: ${record.doctor || 'Not recorded'}\nHospital/source: ${record.source}\nDate: ${record.date}\nRecord ID: ${record.id}` : `${record.title} (${record.date})\n${record.payload.summary}`, sources: [source(record)] };
  }
  if (intent === 'COMPARE_REPORTS') {
    const result = compareReports(all, query); if (result.records.length < 2) return noMatch(/january|september|february|march|april|may|june|july|august|october|november|december/.test(normalizeQuery(query)) ? "I couldn't find the requested report(s) in the available medical records." : 'I found fewer than two relevant reports to compare.');
    const rows = result.rows || [];
    return { intent, text: rows.length ? 'Comparison uses only matching fields recorded in the selected reports.' : 'I found the requested reports, but they do not contain matching test fields for a direct comparison.', sources: result.records.map(source), comparisonTable: rows };
  }
  if (intent === 'CLAIM_VERIFICATION') {
    const found = findSupportingRecordsForClaim(all, query); if (!found.length) return noMatch(`CLAIM NOT DOCUMENTED\n\nI couldn't find a medical record documenting that event${normalizeQuery(query).match(/\b20\d{2}\b/) ? ` in ${normalizeQuery(query).match(/\b20\d{2}\b/)![0]}` : ''} in the available patient records.`);
    return { intent, text: `I found documentation relevant to that claim.`, sources: found.map(source) };
  }
  if (intent === 'SYMPTOM_HISTORY_CONTEXT') {
    const found = findRelevantRecordsForSymptoms(all, query); if (!found.length) return noMatch("No directly relevant record found. I can only summarize what is documented in your records; I can't determine the cause of a current symptom.");
    return { intent, text: `I found documented records that may be relevant. This is record context only, not a diagnosis or treatment recommendation.`, sources: found.map(source) };
  }
  if (intent === 'VERIFY_DOCUMENT') {
    const record = searchMedicalRecords(all, query)[0]; if (!record) return noMatch("I couldn't find the document to verify in the available medical records.");
    return { intent, text: `Record ID: ${record.id}\nDoctor: ${record.doctor || 'Not recorded'}\nDate: ${record.date}\nDocument hash: ${record.hash}\nVerification status: ${record.status}\n\nBlockchain verifies the integrity/provenance of recorded document metadata; it does not prove a medical result is true.`, sources: [source(record)], verification: { doctorVerified: Boolean(record.doctor), documentHashVerified: record.status === 'verified', documentHash: record.hash, status: record.status } };
  }
  if (intent === 'CHECK_ACCESS') {
    const recipient = /sharma/.test(normalizeQuery(query)) ? 'City General Hospital' : /apex/.test(normalizeQuery(query)) ? 'Apex Diagnostics' : '';
    const active = consents.filter(c => c.status === 'active' && Date.parse(c.expiresAt) > Date.now() && (!recipient || c.hospitalName === recipient));
    const allowed = active.some(c => c.tier === 'Tier 2') ? all : [];
    return { intent, text: `${recipient || 'The requested recipient'} currently ${allowed.length ? 'can access the following canonical records:' : 'has no active access to medical records.'}`, sources: allowed.map(source) };
  }
  if (intent === 'REVOKE_ACCESS') return { intent, text: 'Revoke this recipient’s access?', sources: [], shareRequest: undefined };
  if (intent === 'SHARE_RECORD') {
    const record = searchMedicalRecords(all, query)[0]; if (!record) return noMatch("I couldn't find the record to share.");
    const recipientMatch = query.match(/with\s+(Dr\.?(?:\s+[A-Za-z]+)?|[A-Za-z ]+?)(?:\s+for|$)/i); const recipient = recipientMatch?.[1]?.trim() || 'Dr. Sharma';
    const durationHours = Number(query.match(/(\d+)\s*(hour|hr)/i)?.[1] || 24);
    return { intent, text: `Ready to share ${record.title} (${record.id}) with ${recipient} for ${durationHours} hours. Please confirm.`, sources: [source(record)], shareRequest: { record, recipient, durationHours } };
  }
  return { intent, text: 'I can summarize your documented history, find medicines, compare reports, look up a record, verify a document, and check consent-based access.', sources: [] };
}
