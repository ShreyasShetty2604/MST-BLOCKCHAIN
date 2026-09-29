import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { PlannedMeal, GiLevel } from '../../../../features/nutrition/dietPlan';
import { MEAL_ICONS } from '../shared';

// GI is a status (low is good), so it wears the status colours, always with its label.
const GI_BADGE: Record<GiLevel, { text: string; className: string }> = {
  Low: { text: 'Low GI', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' },
  Med: { text: 'Medium GI', className: 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300' },
  High: { text: 'High GI', className: 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300' }
};

interface MealStripProps {
  meals: PlannedMeal[];
  eaten: Set<string>;
  nextMeal?: string;
  onToggle: (type: string, eaten: boolean) => void;
}

// Horizontally scrolling meal cards (snap). The tick logs the meal and feeds the rings live.
export const MealStrip: React.FC<MealStripProps> = ({ meals, eaten, nextMeal, onToggle }) => (
  <ul className="wv-scroll -mx-5 sm:-mx-6 px-5 sm:px-6 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
    {meals.map((m) => {
      const Icon = MEAL_ICONS[m.type];
      const done = eaten.has(m.type);
      const gi = GI_BADGE[m.gi];
      return (
        <li
          key={m.type}
          className={`snap-start shrink-0 w-[200px] rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
            m.type === nextMeal ? 'bg-teal-50/70 dark:bg-teal-400/[0.07] ring-1 ring-teal-600/20 dark:ring-teal-300/20' : 'bg-slate-50 dark:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />}
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{m.type}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {m.time}
                  {m.type === nextMeal ? ' · Next' : ''}
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => onToggle(m.type, !done)}
              aria-pressed={done}
              aria-label={done ? `Mark ${m.type} as not eaten` : `Mark ${m.type} as eaten`}
              title={done ? 'Eaten, tap to undo' : 'Mark as eaten'}
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 ${
                done ? 'bg-teal-600 text-white scale-100' : 'ring-2 ring-inset ring-slate-300 dark:ring-slate-600 text-transparent hover:text-slate-400 hover:ring-teal-500'
              }`}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3 flex-1">{m.items}</p>
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${gi.className}`}>{gi.text}</span>
            <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{m.calories} kcal</span>
          </div>
          {m.allergyWarning && (
            <p className="flex items-start gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span className="line-clamp-2">{m.allergyWarning}</span>
            </p>
          )}
        </li>
      );
    })}
  </ul>
);
