import { useCallback, useEffect, useState } from 'react';
import { ActivityKind, activityKcal } from './metrics';
import { Verdict } from '../../../../features/nutrition/mealScan';

// Today's live log for one patient: meal ticks, scanned meals, water and activities.
// Browser-local per patient per day (a demo convenience; nothing here goes to the vault).

export interface ScanEntry {
  at: number; // minutes since midnight
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  verdict?: Verdict; // missing on scans logged before verdicts were stored
  flag?: string; // what got it flagged, e.g. "sweets"
}

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  minutes: number;
  kcal: number;
  at: number; // minutes since midnight
}

interface DayState {
  mealTicks: Record<string, boolean>; // explicit ticks/unticks; untouched meals follow the clock
  scans: ScanEntry[];
  water: number;
  activities: ActivityEntry[];
}

const EMPTY: DayState = { mealTicks: {}, scans: [], water: 0, activities: [] };
const today = () => new Date().toISOString().slice(0, 10);
const keyFor = (personaId: string) => `medivault_wellness_day_${personaId}_${today()}`;
const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

function load(personaId: string): DayState {
  try {
    const raw = localStorage.getItem(keyFor(personaId));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
    // Carry over glasses logged with the earlier water tracker today.
    const water = Number(localStorage.getItem(`medivault_water_${personaId}_${today()}`)) || 0;
    return { ...EMPTY, water };
  } catch {
    return EMPTY;
  }
}

export function useDayLog(personaId: string, weightKg: number) {
  const [state, setState] = useState<DayState>(() => load(personaId));
  useEffect(() => setState(load(personaId)), [personaId]);

  const update = useCallback(
    (fn: (s: DayState) => DayState) =>
      setState((prev) => {
        const next = fn(prev);
        try {
          localStorage.setItem(keyFor(personaId), JSON.stringify(next));
        } catch {
          /* storage unavailable: keep in memory */
        }
        return next;
      }),
    [personaId]
  );

  return {
    ...state,
    setMealEaten: (type: string, eaten: boolean) => update((s) => ({ ...s, mealTicks: { ...s.mealTicks, [type]: eaten } })),
    addScan: (n: { carbsG: number; proteinG: number; fatG: number; verdict: Verdict; flag?: string }) =>
      update((s) => ({
        ...s,
        scans: [...s.scans, { ...n, kcal: Math.round(n.carbsG * 4 + n.proteinG * 4 + n.fatG * 9), at: nowMinutes() }]
      })),
    setWater: (glasses: number) => update((s) => ({ ...s, water: Math.max(0, Math.min(12, glasses)) })),
    addActivity: (kind: ActivityKind, minutes: number) =>
      update((s) => ({
        ...s,
        activities: [
          ...s.activities,
          { id: `${Date.now()}`, kind, minutes, kcal: activityKcal(kind, minutes, weightKg), at: nowMinutes() }
        ]
      })),
    removeActivity: (id: string) => update((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== id) }))
  };
}

export type DayLog = ReturnType<typeof useDayLog>;
