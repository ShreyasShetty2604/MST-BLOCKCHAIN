import React, { useEffect, useState } from 'react';
import { useChartTokens, arcPath, polar } from './theme';

// Semicircle BMI meter with Asian cut-off zones. Zones are status (good / warning / serious),
// so they use the status colours; each zone is also labelled, never colour-alone.
const MIN = 15;
const MAX = 35;
const ZONES = [
  { label: 'Underweight', from: MIN, to: 18.5, tone: 'warn' as const, range: '< 18.5' },
  { label: 'Normal', from: 18.5, to: 23, tone: 'good' as const, range: '18.5–22.9' },
  { label: 'Overweight', from: 23, to: 25, tone: 'warn' as const, range: '23–24.9' },
  { label: 'Obese', from: 25, to: MAX, tone: 'bad' as const, range: '≥ 25' }
];

const angleOf = (bmi: number) => 180 - ((Math.min(Math.max(bmi, MIN), MAX) - MIN) / (MAX - MIN)) * 180;

export const BmiGauge: React.FC<{ bmi: number; compact?: boolean }> = ({ bmi, compact = false }) => {
  const t = useChartTokens();
  const [shown, setShown] = useState(MIN); // needle eases in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(bmi));
    return () => cancelAnimationFrame(id);
  }, [bmi]);

  const active = ZONES.find((z) => bmi >= z.from && bmi < z.to) ?? ZONES[ZONES.length - 1];
  const cx = 110;
  const cy = 110;
  const r = 86;

  return (
    <figure className={compact ? 'space-y-2' : 'space-y-4'}>
      <svg viewBox="0 0 220 128" className="w-full max-w-xs mx-auto block" role="img" aria-label={`BMI ${bmi.toFixed(1)}, ${active.label} by Asian cut-offs`}>
        {ZONES.map((z) => {
          const gap = 0.12; // BMI units of surface gap between zones
          const from = angleOf(z.from + (z.from === MIN ? 0 : gap));
          const to = angleOf(z.to - (z.to === MAX ? 0 : gap));
          const isActive = z === active;
          return (
            <path
              key={z.label}
              d={arcPath(cx, cy, r, from, to)}
              fill="none"
              stroke={t.status[z.tone]}
              strokeOpacity={isActive ? 1 : 0.28}
              strokeWidth={14}
              strokeLinecap="butt"
            >
              <title>{`${z.label}: BMI ${z.range}`}</title>
            </path>
          );
        })}
        {[18.5, 23, 25].map((v) => {
          const p = polar(cx, cy, r + 14, angleOf(v));
          return (
            <text key={v} x={p.x} y={p.y} fontSize="9" fill={t.muted} textAnchor="middle" dominantBaseline="middle">
              {v}
            </text>
          );
        })}
        {/* Needle drawn pointing right, then rotated (CSS transforms animate; SVG endpoints don't). */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + r - 22}
          y2={cy}
          stroke={t.ink}
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{
            transform: `rotate(${-angleOf(shown)}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 900ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
        <circle cx={cx} cy={cy} r={6} fill={t.ink} stroke={t.surface} strokeWidth={2} />
      </svg>

      <figcaption className="text-center -mt-2">
        <span className="block text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{bmi.toFixed(1)}</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{active.label} · Asian cut-offs</span>
      </figcaption>

      {!compact && (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
        {ZONES.map((z) => (
          <li key={z.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.status[z.tone], opacity: z === active ? 1 : 0.4 }} />
            <span className={z === active ? 'font-semibold text-slate-700 dark:text-slate-200' : ''}>
              {z.label} {z.range}
            </span>
          </li>
        ))}
      </ul>
      )}
    </figure>
  );
};
