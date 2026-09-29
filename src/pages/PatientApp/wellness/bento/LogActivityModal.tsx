import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bike, Footprints, PersonStanding, X, LucideIcon } from 'lucide-react';
import { ACTIVITY_MET, ActivityKind, activityKcal, STEPS_PER_WALK_MINUTE } from './metrics';

const KIND_ICONS: Record<ActivityKind, LucideIcon> = { walk: Footprints, yoga: PersonStanding, cycling: Bike };
const QUICK_MINUTES = [15, 30, 45, 60];

interface LogActivityModalProps {
  open: boolean;
  weightKg: number;
  onClose: () => void;
  onSave: (kind: ActivityKind, minutes: number) => void;
}

// Bottom sheet on mobile, centred dialog on larger screens. Portalled to <body> so transformed
// ancestors (the card hover lift) can't trap position: fixed.
export const LogActivityModal: React.FC<LogActivityModalProps> = ({ open, weightKg, onClose, onSave }) => {
  const [kind, setKind] = useState<ActivityKind>('walk');
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const valid = minutes >= 1 && minutes <= 300;
  const kcal = valid ? activityKcal(kind, minutes, weightKg) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="wv-log-title">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(kind, minutes);
        }}
        className="relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] bg-white dark:bg-slate-900 dark:ring-1 dark:ring-white/10 p-6 space-y-6 shadow-2xl animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <h2 id="wv-log-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Log activity
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Activity">
          {(Object.keys(ACTIVITY_MET) as ActivityKind[]).map((k) => {
            const Icon = KIND_ICONS[k];
            const active = k === kind;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(k)}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-6 h-6" />
                {ACTIVITY_MET[k].label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <label htmlFor="wv-minutes" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Minutes
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              id="wv-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={300}
              value={Number.isFinite(minutes) ? minutes : ''}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
              className="w-24 h-11 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-lg font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`h-9 px-3 rounded-full text-sm font-medium transition-colors ${
                  minutes === m ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4">
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            ≈ {kcal} <span className="text-sm font-semibold uppercase">kcal</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            MET {ACTIVITY_MET[kind].met} × {weightKg} kg × {valid ? (minutes / 60).toFixed(2) : '–'} h
            {kind === 'walk' && valid ? ` · adds ≈ ${(minutes * STEPS_PER_WALK_MINUTE).toLocaleString('en-IN')} steps` : ''}
          </p>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="w-full h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold transition-colors"
        >
          Add to today
        </button>
      </form>
    </div>,
    document.body
  );
};
