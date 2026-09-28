import React, { useEffect, useState } from 'react';
import { NutritionEstimate } from '../features/nutrition/mealScan';

export interface DailyReference {
  carbsG: number;
  proteinG: number;
  fatG: number;
  sugarG: number; // limit
  sodiumMg: number; // limit
}

// Grams and milligrams can't share one axis, so every bar is "% of your daily target/limit"
// (one common scale); the native amount is the direct label.
export const NutritionBars: React.FC<{ estimate: NutritionEstimate; daily: DailyReference }> = ({ estimate, daily }) => {
  const rows = [
    { label: 'Carbs', value: estimate.carbsG, unit: 'g', ref: daily.carbsG, kind: 'target' },
    { label: 'Protein', value: estimate.proteinG, unit: 'g', ref: daily.proteinG, kind: 'target' },
    { label: 'Fat', value: estimate.fatG, unit: 'g', ref: daily.fatG, kind: 'target' },
    { label: 'Sugar', value: estimate.sugarG, unit: 'g', ref: daily.sugarG, kind: 'limit' },
    { label: 'Sodium', value: estimate.sodiumMg, unit: 'mg', ref: daily.sodiumMg, kind: 'limit' }
  ].map((r) => ({ ...r, pct: Math.round((r.value / r.ref) * 100) }));

  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Nutrition estimate</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">% of your daily target or limit · AI estimate</p>
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[4rem_1fr_auto] items-center gap-3" title={`${r.label}: ${r.value} ${r.unit} = ${r.pct}% of your daily ${r.kind} (${r.ref} ${r.unit})`}>
            <span className="text-xs text-slate-500 dark:text-slate-400">{r.label}</span>
            <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <span
                className={`block h-full rounded-full ${r.pct > 100 ? 'bg-amber-500' : 'bg-teal-600 dark:bg-teal-400'}`}
                style={{ width: grown ? `${Math.min(100, r.pct)}%` : 0, transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </span>
            <span className="text-xs tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {Math.round(r.value)} {r.unit} · {r.pct}%{r.pct > 100 ? ' · over' : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
