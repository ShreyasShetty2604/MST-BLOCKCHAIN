// Illustrative "demo data" for the Wellness visuals (intake logs, trends, adherence).
// Deterministic per patient (seeded), and anchored to real values wherever they exist:
// the latest HbA1c comes from the patient's records, and the weight trend ends at their weight.

import { MedicalRecord } from '../../mock/types';
import { PlannedMeal } from './dietPlan';
import { hba1cReadings } from './recordInsights';

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function minutesOf(time: string): number {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return h * 60 + Number(m[2]);
}

// ---------------------------------------------------------------------------
// Today: which planned meals are "logged" (demo: every meal whose time has passed)
// ---------------------------------------------------------------------------

export interface TodayLog {
  logged: Set<string>; // meal types
  eatenCalories: number;
}

export function todayLog(meals: PlannedMeal[], now = new Date()): TodayLog {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const logged = new Set(meals.filter((m) => minutesOf(m.time) <= nowMin).map((m) => m.type));
  const eatenCalories = meals.filter((m) => logged.has(m.type)).reduce((sum, m) => sum + m.calories, 0);
  return { logged, eatenCalories };
}

// ---------------------------------------------------------------------------
// HbA1c trend (last 12 months)
// ---------------------------------------------------------------------------

export interface Hba1cPoint {
  date: string; // YYYY-MM-DD
  value: number;
  verified: boolean;
  source: string;
  demo: boolean;
}

export function hba1cTrend(records: MedicalRecord[], personaId: string, isDiabetic: boolean, today = new Date()): Hba1cPoint[] {
  const real = hba1cReadings(records).map((r) => ({
    date: r.record.date,
    value: r.value,
    verified: r.verified,
    source: r.verified ? `${r.record.source} (hospital record)` : 'Self-declared record',
    demo: false
  }));
  if (!isDiabetic && real.length === 0) return [];

  // Demo history every ~2 months, easing down towards the latest real value (or 7.2%).
  const rand = seededRandom(`${personaId}:hba1c`);
  const anchor = real.length ? real[real.length - 1] : undefined;
  const endValue = anchor?.value ?? 7.2;
  const endDate = anchor ? new Date(`${anchor.date}T00:00:00`) : today;
  const points: Hba1cPoint[] = [];
  for (let i = 5; i >= 1; i--) {
    const d = new Date(endDate);
    d.setMonth(d.getMonth() - i * 2);
    const cutoff = new Date(today);
    cutoff.setMonth(cutoff.getMonth() - 12);
    if (d < cutoff) continue;
    const hospital = i % 2 === 1;
    points.push({
      date: d.toISOString().slice(0, 10),
      value: round1(endValue + i * 0.22 + (rand() - 0.5) * 0.2),
      verified: hospital,
      source: hospital ? 'Hospital lab' : 'Home test kit',
      demo: true
    });
  }
  return [...points, ...real].sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Weight trend (12 weeks) with a target at the top of the Asian "normal" BMI band
// ---------------------------------------------------------------------------

export function weightTrend(currentKg: number, heightCm: number, personaId: string) {
  const rand = seededRandom(`${personaId}:weight`);
  const h = heightCm / 100;
  const targetKg = Math.round(22.9 * h * h);
  const startKg = currentKg + (currentKg > targetKg ? 3.2 : -1.2);
  const points = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const value = i === 11 ? currentKg : round1(startKg + (currentKg - startKg) * t + (rand() - 0.5) * 0.6);
    return { week: `W${i + 1}`, value };
  });
  return { points, targetKg };
}

// ---------------------------------------------------------------------------
// Weekly adherence: 7 days × meal slots
// ---------------------------------------------------------------------------

export type AdherenceState = 'followed' | 'off-plan' | 'not-logged' | 'upcoming';

export interface AdherenceDay {
  label: string; // Mon, Tue…
  date: string;
  cells: { meal: string; state: AdherenceState }[];
}

export function weeklyAdherence(meals: PlannedMeal[], personaId: string, now = new Date()): AdherenceDay[] {
  const rand = seededRandom(`${personaId}:adherence:${now.toISOString().slice(0, 10)}`);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const isToday = i === 6;
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      cells: meals.map((m) => {
        if (isToday && minutesOf(m.time) > nowMin) return { meal: m.type, state: 'upcoming' as const };
        const r = rand();
        return { meal: m.type, state: (r < 0.72 ? 'followed' : r < 0.9 ? 'off-plan' : 'not-logged') as AdherenceState };
      })
    };
  });
}

// Today's macro intake (demo): a little carb-heavy vs the plan, as typical Indian meals run.
export function todayMacroIntake(eatenCalories: number, split: { Carbs: number; Protein: number; Fat: number }, personaId: string) {
  const rand = seededRandom(`${personaId}:intake`);
  const carbs = split.Carbs + 0.05 + rand() * 0.03;
  const protein = Math.max(0.1, split.Protein - 0.04 - rand() * 0.02);
  const fat = 1 - carbs - protein;
  const shares = { Carbs: carbs, Protein: protein, Fat: fat };
  const kcalPerGram = { Carbs: 4, Protein: 4, Fat: 9 };
  return (['Carbs', 'Protein', 'Fat'] as const).map((name) => ({
    name,
    grams: Math.round((eatenCalories * shares[name]) / kcalPerGram[name]),
    percent: Math.round(shares[name] * 100)
  }));
}
