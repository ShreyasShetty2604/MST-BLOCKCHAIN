import React from 'react';
import { GlassWater } from 'lucide-react';

const ML_PER_GLASS = 250;

// Tap a glass to fill up to it; tap the last filled glass again to empty it.
// Controlled: the count lives in the day log so the rings update with it.
export const WaterTracker: React.FC<{ count: number; goal: number; color: string; onChange: (next: number) => void }> = ({ count, goal, color, onChange }) => (
  <div className="space-y-4">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
        {count}
        <span className="text-sm font-medium text-slate-400"> / {goal} glasses</span>
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{((count * ML_PER_GLASS) / 1000).toFixed(2)} L</span>
    </div>
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }} role="group" aria-label="Glasses of water today">
      {Array.from({ length: goal }, (_, i) => {
        const filled = i < count;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(filled && i === count - 1 ? i : i + 1)}
            aria-pressed={filled}
            aria-label={`Glass ${i + 1}${filled ? ', filled' : ''}`}
            title={`Glass ${i + 1}`}
            className={`aspect-[3/4] rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 ${
              filled ? 'text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500'
            }`}
            style={filled ? { background: color } : undefined}
          >
            <GlassWater className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  </div>
);
