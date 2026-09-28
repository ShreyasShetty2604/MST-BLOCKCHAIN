import React, { useEffect, useState } from 'react';
import { useChartTokens } from './theme';

// Apple-Watch-style progress ring: calories eaten vs target, with macro mini rings beside it.

const Ring: React.FC<{ size: number; stroke: number; value: number; color: string; track: string; label: string; children?: React.ReactNode }> = ({
  size,
  stroke,
  value,
  color,
  track,
  label,
  children
}) => {
  const [progress, setProgress] = useState(0); // animate from empty on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setProgress(Math.min(Math.max(value, 0), 1)));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <title>{label}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
};

export interface MacroProgress {
  name: 'Carbs' | 'Protein' | 'Fat';
  eaten: number;
  target: number;
}

export const ActivityRings: React.FC<{ eaten: number; target: number; macros: MacroProgress[] }> = ({ eaten, target, macros }) => {
  const t = useChartTokens();
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <Ring size={148} stroke={14} value={eaten / target} color={t.accent} track={t.track} label={`${eaten} of ${target} kcal eaten`}>
        <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{eaten.toLocaleString()}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">of {target.toLocaleString()} kcal</span>
      </Ring>

      <ul className="w-full space-y-3">
        {macros.map((m) => (
          <li key={m.name} className="flex items-center gap-3">
            <Ring size={40} stroke={5} value={m.eaten / m.target} color={t.macro[m.name]} track={t.track} label={`${m.name}: ${m.eaten} of ${m.target} g`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {m.eaten} / {m.target} g
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
