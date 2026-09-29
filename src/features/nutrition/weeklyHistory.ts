// Day-by-day history for the Weekly Progress charts: seeded demo data for the last 9 weeks
// (so 8 full weeks plus the current one), with today replaced by the patient's live log.
// Trends drift gently in the right direction (carbs, fasting sugar and weight easing down;
// water and steps creeping up) so the week-on-week comparisons read like a real patient.

import { Verdict } from './mealScan';
import { seededRandom } from './demoProgress';

export const HEATMAP_MEALS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;
export type HeatmapMeal = (typeof HEATMAP_MEALS)[number];
export type MealAdherence = 'followed' | 'partly' | 'off' | 'none';

export interface ScanRecord {
  verdict: Verdict;
  flag?: string; // what got the meal flagged, e.g. "sweets"
}

export interface DayMetrics {
  date: string; // YYYY-MM-DD (local)
  isToday: boolean;
  hasData: boolean; // false for future days and days before the history starts
  eatenKcal: number | null;
  burnedKcal: number | null;
  water: number | null;
  carbsG: number | null;
  steps: number | null;
  glucose: number | null; // fasting, mg/dL
  weightKg: number | null;
  meals: Record<HeatmapMeal, MealAdherence>;
  scans: ScanRecord[];
}

export interface LiveToday {
  eatenKcal: number;
  burnedKcal: number;
  water: number;
  carbsG: number;
  steps: number;
  eatenMeals: Set<string>;
  scans: ScanRecord[];
}

export const HISTORY_DAYS = 63;

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const FLAGS = ['sweets', 'sweets', 'sweets', 'fried food', 'refined carbs', 'salty snacks'];
const noise = (r: () => number, amp: number) => (r() - 0.5) * 2 * amp;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface HistoryInput {
  personaId: string;
  targetKcal: number;
  carbLimitG: number;
  weightKg: number;
  isDiabetic: boolean;
  live: LiveToday;
  today?: Date;
}

// Builds the demo history once per patient/profile; `withLiveToday` swaps in today's live values.
export function demoHistory({ personaId, targetKcal, carbLimitG, weightKg, isDiabetic }: Omit<HistoryInput, 'live'>, today = new Date()): DayMetrics[] {
  const start = addDays(today, -(HISTORY_DAYS - 1));
  const startWeight = weightKg + 1.8;
  return Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const date = addDays(start, i);
    const key = ymd(date);
    const r = seededRandom(`${personaId}:day:${key}`);
    const p = i / (HISTORY_DAYS - 1); // 0 = oldest, 1 = today
    const weekend = date.getDay() === 0 || date.getDay() === 6;

    const meals = {} as Record<HeatmapMeal, MealAdherence>;
    for (const m of HEATMAP_MEALS) {
      const x = r();
      const followed = (m === 'Snack' ? 0.45 : 0.6) + 0.22 * p - (weekend ? 0.1 : 0);
      meals[m] = x < followed ? 'followed' : x < followed + 0.22 ? 'partly' : 'off';
    }

    const scans: ScanRecord[] = [];
    const scanCount = r() < 0.35 ? 0 : r() < 0.7 ? 1 : 2;
    for (let s = 0; s < scanCount; s++) {
      const v = r();
      const redShare = 0.16 - 0.06 * p;
      const verdict: Verdict = v < redShare ? 'avoid' : v < redShare + 0.34 ? 'caution' : 'clear';
      scans.push(verdict === 'clear' ? { verdict } : { verdict, flag: FLAGS[Math.floor(r() * FLAGS.length)] });
    }

    return {
      date: key,
      isToday: false,
      hasData: true,
      eatenKcal: Math.round(targetKcal * (1.1 - 0.1 * p) + noise(r, 190) + (weekend ? 120 : 0)),
      burnedKcal: Math.round(clamp(290 + 110 * p + noise(r, 90) + (weekend ? 70 : 0), 120, 720)),
      water: Math.round(clamp(5 + 2 * p + noise(r, 1.6), 2, 10)),
      carbsG: Math.round(carbLimitG * (1.1 - 0.16 * p) + noise(r, 38) + (weekend ? 20 : 0)),
      steps: Math.round(clamp(5200 + 2200 * p + noise(r, 1600) + (weekend ? 900 : 0), 1500, 14000)),
      glucose: Math.round(isDiabetic ? 150 - 26 * p + noise(r, 15) : 96 + noise(r, 7)),
      weightKg: Math.round((startWeight + (weightKg - startWeight) * p + noise(r, 0.25)) * 10) / 10,
      meals,
      scans
    };
  });
}

export function withLiveToday(history: DayMetrics[], live: LiveToday, weightKg: number, now = new Date()): DayMetrics[] {
  const key = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  // Rough plan times, to tell "not eaten yet" apart from "skipped".
  const mealTime: Record<HeatmapMeal, number> = { Breakfast: 510, Lunch: 810, Snack: 1020, Dinner: 1230 };
  return history.map((d) => {
    if (d.date !== key) return d;
    const meals = {} as Record<HeatmapMeal, MealAdherence>;
    for (const m of HEATMAP_MEALS) meals[m] = live.eatenMeals.has(m) ? 'followed' : nowMin > mealTime[m] + 120 ? 'off' : 'none';
    return {
      ...d,
      isToday: true,
      eatenKcal: live.eatenKcal,
      burnedKcal: live.burnedKcal,
      water: live.water,
      carbsG: live.carbsG,
      steps: live.steps,
      weightKg,
      meals,
      scans: live.scans
    };
  });
}

// Picks the days for a period; days outside the history (future, or too old) come back empty.
export function daysInRange(history: DayMetrics[], start: Date, count: number): DayMetrics[] {
  const byDate = new Map(history.map((d) => [d.date, d]));
  const empty = Object.fromEntries(HEATMAP_MEALS.map((m) => [m, 'none'])) as Record<HeatmapMeal, MealAdherence>;
  return Array.from({ length: count }, (_, i) => {
    const key = ymd(addDays(start, i));
    return (
      byDate.get(key) ?? {
        date: key,
        isToday: false,
        hasData: false,
        eatenKcal: null,
        burnedKcal: null,
        water: null,
        carbsG: null,
        steps: null,
        glucose: null,
        weightKg: null,
        meals: empty,
        scans: []
      }
    );
  });
}

// What got a scanned meal flagged, from its dish names and ingredients.
const FLAG_KEYWORDS: [string, RegExp][] = [
  ['sweets', /jamun|halwa|ladoo|laddu|kheer|jalebi|barfi|mithai|sweet|sugar|jaggery|gur|syrup|payasam|rasgulla|chocolate|cake|ice cream/i],
  ['fried food', /fried|pakora|pakoda|samosa|puri|poori|bhatura|vada|bonda|chips|kachori|namak para/i],
  ['salty snacks', /pickle|achar|papad|namkeen|bhujia|salt/i],
  ['refined carbs', /maida|naan|white rice|white bread|noodles|pasta|pav/i],
  ['allergens', /peanut|groundnut|cashew|almond|prawn|shrimp|egg|milk|paneer|wheat/i]
];

export function flagOf(text: string): string | undefined {
  return FLAG_KEYWORDS.find(([, re]) => re.test(text))?.[0];
}
