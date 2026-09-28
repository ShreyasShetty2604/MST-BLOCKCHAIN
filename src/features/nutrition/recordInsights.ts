// Reads clinical values (HbA1c, blood pressure) from the patient's medical records — the same
// records the Records page shows — and derives the diet adjustments and checkup schedule from them.

import { CheckupReminder, MedicalRecord } from '../../mock/types';

export const STRICT_CARB_HBA1C = 8; // % — at or above this, carbs drop to 40% of calories

export interface RecordReading<T> {
  value: T;
  record: MedicalRecord;
  verified: boolean; // hospital-issued, signature-verified and not tampered
}

export interface LabInsights {
  hba1c: RecordReading<number> | null;
  bp: RecordReading<{ systolic: number; diastolic: number }> | null;
  tamperedHba1c: MedicalRecord | null; // newest HbA1c report failed its integrity check (not used)
}

const isTampered = (r: MedicalRecord) => r.status === 'tampered' || Boolean(r.tamperedHash);
const isVerified = (r: MedicalRecord) => r.sourceType === 'hospital' && r.status === 'verified' && !isTampered(r);
const newestFirst = (a: MedicalRecord, b: MedicalRecord) => b.date.localeCompare(a.date);

function findValue(record: MedicalRecord, key: RegExp): string | undefined {
  const entry = Object.entries(record.payload.details ?? {}).find(([k]) => key.test(k));
  return entry?.[1];
}

const HBA1C_KEY = /hba1c|glycated ha?emoglobin/i;
// "Blood Pressure", "BP", "Systolic/Diastolic" — but not eye pressure ("IOP").
const BP_KEY = /blood pressure|^bp\b|systolic/i;

// Every intact HbA1c reading in the records, oldest first (for trend charts).
export function hba1cReadings(records: MedicalRecord[]): RecordReading<number>[] {
  return records
    .filter((r) => !isTampered(r))
    .map((record) => {
      const match = findValue(record, HBA1C_KEY)?.match(/(\d+(?:\.\d+)?)\s*%/);
      return match ? { value: parseFloat(match[1]), record, verified: isVerified(record) } : null;
    })
    .filter((x): x is RecordReading<number> => x !== null)
    .sort((a, b) => a.record.date.localeCompare(b.record.date));
}

export function readLabInsights(records: MedicalRecord[]): LabInsights {
  const sorted = [...records].sort(newestFirst);

  let hba1c: LabInsights['hba1c'] = null;
  let tamperedHba1c: MedicalRecord | null = null;
  for (const record of sorted) {
    const raw = findValue(record, HBA1C_KEY);
    const match = raw?.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) continue;
    if (isTampered(record)) {
      tamperedHba1c ??= record; // remember it, but fall back to an older intact report
      continue;
    }
    hba1c = { value: parseFloat(match[1]), record, verified: isVerified(record) };
    break;
  }

  let bp: LabInsights['bp'] = null;
  for (const record of sorted) {
    if (isTampered(record)) continue;
    const match = findValue(record, BP_KEY)?.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (!match) continue;
    bp = { value: { systolic: Number(match[1]), diastolic: Number(match[2]) }, record, verified: isVerified(record) };
    break;
  }

  // Only warn about a tampered report if it is newer than the one we used.
  if (tamperedHba1c && hba1c && hba1c.record.date >= tamperedHba1c.date) tamperedHba1c = null;

  return { hba1c, bp, tamperedHba1c };
}

// ---------------------------------------------------------------------------
// Checkup schedule, derived from the last matching record
// ---------------------------------------------------------------------------

export interface DerivedCheckup extends CheckupReminder {
  basedOn?: string; // title of the record the schedule was computed from
  intervalLabel: string;
  intervalMonths: number;
}

const DUE_SOON_DAYS = 30;

const CHECKUP_RULES: {
  id: string;
  title: string;
  months: number | ((conditions: string[]) => number);
  appliesTo: RegExp; // conditions that make this checkup necessary
  matches: (r: MedicalRecord) => boolean;
}[] = [
  {
    id: 'hba1c',
    title: 'HbA1c & Glycemic Control Check',
    months: 3,
    appliesTo: /diabet|glyc|insulin/i,
    matches: (r) => Boolean(findValue(r, HBA1C_KEY))
  },
  {
    id: 'bp',
    title: 'Blood Pressure Check',
    months: 1,
    appliesTo: /hypertension|blood pressure/i,
    matches: (r) => Boolean(findValue(r, BP_KEY)?.match(/\d{2,3}\s*\/\s*\d{2,3}/))
  },
  {
    id: 'lipid',
    title: 'Lipid Profile Test',
    months: 12,
    appliesTo: /diabet|hyperlipid|cholesterol|coronary|heart/i,
    matches: (r) => /lipid/i.test(r.title) || Boolean(findValue(r, /ldl|cholesterol/i))
  },
  {
    id: 'kidney',
    title: 'Kidney Function (Creatinine & eGFR)',
    months: (conditions) => (conditions.some((c) => /kidney|renal|ckd/i.test(c)) ? 3 : 12),
    appliesTo: /kidney|renal|ckd|diabet/i,
    matches: (r) => Boolean(findValue(r, /creatinine|egfr/i))
  },
  {
    id: 'haemoglobin',
    title: 'Haemoglobin / CBC Check',
    months: 3,
    appliesTo: /anaemi|anemi/i,
    matches: (r) => Object.keys(r.payload.details ?? {}).some((k) => /h(a)?emoglobin|^hb$|cbc/i.test(k) && !/a1c|glycated/i.test(k))
  },
  {
    id: 'antenatal',
    title: 'Antenatal Check-up',
    months: 1,
    appliesTo: /pregnan/i,
    matches: (r) => /antenatal|prenatal|obstetric|pregnan/i.test(r.title)
  },
  {
    id: 'eye',
    title: 'Diabetic Eye & Retinal Screening',
    months: 12,
    appliesTo: /diabet/i,
    matches: (r) => /retina|ophthalm|eye/i.test(r.title)
  },
  {
    id: 'foot',
    title: 'Diabetic Foot & Monofilament Exam',
    months: 12,
    appliesTo: /diabet/i,
    matches: (r) => /foot|monofilament|neuropathy|podiat/i.test(r.title)
  },
  {
    id: 'annual40',
    title: 'Annual Comprehensive Physical (Age 40+)',
    months: 12,
    appliesTo: /.*|40/i,
    matches: (r) => /annual|physical|checkup|wellness|intake/i.test(r.title)
  }
];

function addMonths(isoDate: string, months: number): Date {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0); // e.g. 31 Jan + 1 month → 28/29 Feb
  return d;
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function deriveCheckups(records: MedicalRecord[], conditions: string[], today = new Date()): DerivedCheckup[] {
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const usable = records.filter((r) => !isTampered(r)).sort(newestFirst);
  const checkups: DerivedCheckup[] = [];

  for (const rule of CHECKUP_RULES) {
    const last = usable.find(rule.matches);
    const needed = conditions.some((c) => rule.appliesTo.test(c));
    if (!last && !needed) continue;

    const months = typeof rule.months === 'function' ? rule.months(conditions) : rule.months;
    const intervalLabel = months === 1 ? 'Every month' : months === 12 ? 'Every year' : `Every ${months} months`;

    if (!last) {
      checkups.push({
        id: rule.id,
        title: rule.title,
        dueState: 'overdue',
        dueStateLabel: 'No report on record',
        dueDate: 'As soon as possible',
        daysRemaining: -1,
        lastDoneDate: 'Never recorded',
        hospitalVerified: false,
        intervalLabel,
        intervalMonths: months
      });
      continue;
    }

    const due = addMonths(last.date, months);
    const days = Math.round((due.getTime() - midnight.getTime()) / 86_400_000);
    const dueState: CheckupReminder['dueState'] = days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'due' : 'done';

    checkups.push({
      id: rule.id,
      title: rule.title,
      dueState,
      dueStateLabel:
        dueState === 'overdue' ? `Overdue by ${-days} days` : dueState === 'due' ? `Due in ${days} days` : `Up to date · due in ${days} days`,
      dueDate: toIso(due),
      daysRemaining: days,
      lastDoneDate: last.date,
      hospitalVerified: isVerified(last),
      hospitalName: last.source,
      txHash: last.txHash,
      basedOn: last.title,
      intervalLabel,
      intervalMonths: months
    });
  }

  return checkups.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
