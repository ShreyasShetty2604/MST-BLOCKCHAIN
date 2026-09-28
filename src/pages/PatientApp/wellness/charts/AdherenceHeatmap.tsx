import React, { useState } from 'react';
import { Check, AlertTriangle, Minus } from 'lucide-react';
import { AdherenceDay, AdherenceState } from '../../../../features/nutrition/demoProgress';

// 7 days × meals. Status colours carry "followed / off-plan", always with an icon and a legend.
const CELL: Record<AdherenceState, { cls: string; icon: React.ReactNode; label: string }> = {
  followed: { cls: 'bg-emerald-500 text-white', icon: <Check className="w-3.5 h-3.5" strokeWidth={3} />, label: 'Followed the plan' },
  'off-plan': { cls: 'bg-amber-400 text-amber-950', icon: <AlertTriangle className="w-3 h-3" />, label: 'Off plan' },
  'not-logged': { cls: 'bg-slate-100 dark:bg-slate-800 text-slate-400', icon: <Minus className="w-3 h-3" />, label: 'Not logged' },
  upcoming: { cls: 'bg-transparent ring-1 ring-inset ring-slate-200 dark:ring-slate-800', icon: null, label: 'Upcoming' }
};

export const AdherenceHeatmap: React.FC<{ days: AdherenceDay[]; mealTypes: string[] }> = ({ days, mealTypes }) => {
  const [hover, setHover] = useState<string | null>(null);
  const logged = days.flatMap((d) => d.cells).filter((c) => c.state === 'followed' || c.state === 'off-plan');
  const followed = logged.filter((c) => c.state === 'followed').length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{logged.length ? Math.round((followed / logged.length) * 100) : 0}%</span>{' '}
        of logged meals followed the plan ({followed} of {logged.length})
      </p>

      <div className="overflow-x-auto -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="border-separate border-spacing-1 min-w-[340px]" onMouseLeave={() => setHover(null)}>
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d.date} className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-1 w-9">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealTypes.map((meal, row) => (
              <tr key={meal}>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pr-2 whitespace-nowrap">{meal}</th>
                {days.map((d) => {
                  const state = d.cells[row].state;
                  const tip = `${d.label} ${meal}: ${CELL[state].label}`;
                  return (
                    <td key={d.date} className="p-0">
                      <div
                        onMouseEnter={() => setHover(tip)}
                        title={tip}
                        aria-label={tip}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform hover:scale-105 ${CELL[state].cls}`}
                      >
                        {CELL[state].icon}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        {(['followed', 'off-plan', 'not-logged'] as AdherenceState[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`w-4 h-4 rounded flex items-center justify-center ${CELL[s].cls}`}>{CELL[s].icon}</span>
            {CELL[s].label}
          </span>
        ))}
        <span className="ml-auto min-h-[1rem] text-slate-700 dark:text-slate-200">{hover}</span>
      </div>
    </div>
  );
};
