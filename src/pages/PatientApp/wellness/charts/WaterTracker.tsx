import React, { useEffect, useState } from 'react';
import { GlassWater } from 'lucide-react';

const GLASSES = 8;
const ML_PER_GLASS = 250;

const keyFor = (personaId: string) => `medivault_water_${personaId}_${new Date().toISOString().slice(0, 10)}`;
const read = (personaId: string) => {
  try {
    return Math.min(GLASSES, Number(localStorage.getItem(keyFor(personaId))) || 0);
  } catch {
    return 0;
  }
};

// Tap a glass to fill up to it; tap the last filled glass again to empty it.
export const WaterTracker: React.FC<{ personaId: string }> = ({ personaId }) => {
  const [count, setCount] = useState(() => read(personaId));
  useEffect(() => setCount(read(personaId)), [personaId]);

  const set = (next: number) => {
    setCount(next);
    try {
      localStorage.setItem(keyFor(personaId), String(next));
    } catch {
      /* storage unavailable: keep in memory */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {count}
          <span className="text-sm font-medium text-slate-400"> / {GLASSES} glasses</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{((count * ML_PER_GLASS) / 1000).toFixed(2)} L</span>
      </div>
      <div className="grid grid-cols-8 gap-1.5" role="group" aria-label="Glasses of water today">
        {Array.from({ length: GLASSES }, (_, i) => {
          const filled = i < count;
          return (
            <button
              key={i}
              type="button"
              onClick={() => set(filled && i === count - 1 ? i : i + 1)}
              aria-pressed={filled}
              aria-label={`Glass ${i + 1}${filled ? ', filled' : ''}`}
              title={`Glass ${i + 1}`}
              className={`aspect-[3/4] rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 ${
                filled
                  ? 'bg-teal-600 dark:bg-teal-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-teal-600'
              }`}
            >
              <GlassWater className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
