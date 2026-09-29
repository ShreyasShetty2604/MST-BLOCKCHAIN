import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { MetricColor, useCountUp, fmt } from './metrics';

// Three concentric activity rings. Each fills clockwise from 12 o'clock; past 100% it keeps
// going over itself with a glowing tip, like the Apple rings (capped at 2 laps).

interface RingSpec {
  id: string;
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: MetricColor;
}

const Ring: React.FC<{ cx: number; r: number; stroke: number; fraction: number; color: MetricColor }> = ({ cx, r, stroke, fraction, color }) => {
  const c = 2 * Math.PI * r;
  const shown = useCountUp(Math.min(Math.max(fraction, 0), 2), 1100);
  const first = Math.min(shown, 1);
  const over = Math.max(0, shown - 1);
  return (
    <g transform={`rotate(-90 ${cx} ${cx})`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color.track} strokeWidth={stroke} />
      {first > 0.004 && (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color.ring}
          strokeWidth={stroke}
          strokeLinecap={first >= 1 ? 'butt' : 'round'}
          strokeDasharray={`${first * c} ${c}`}
        />
      )}
      {over > 0.004 && (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${over * c} ${c}`}
          style={{ filter: `drop-shadow(0 0 5px ${color.ring}) drop-shadow(0 0 2px rgba(0,0,0,0.55))` }}
        />
      )}
    </g>
  );
};

export const RingsGraphic: React.FC<{ rings: RingSpec[]; size?: number }> = ({ rings, size = 200 }) => {
  const stroke = size * 0.1;
  const gap = size * 0.02;
  const cx = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={rings.map((r) => `${r.label} ${fmt(r.value)} of ${fmt(r.goal)} ${r.unit}`).join(', ')}
    >
      {rings.map((ring, i) => (
        <Ring key={ring.id} cx={cx} r={cx - stroke / 2 - i * (stroke + gap)} stroke={stroke} fraction={ring.value / ring.goal} color={ring.color} />
      ))}
    </svg>
  );
};

const RingValue: React.FC<{ ring: RingSpec; action?: React.ReactNode }> = ({ ring, action }) => {
  const value = useCountUp(ring.value);
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{ring.label}</p>
      <div className="flex items-center gap-3">
        <p className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums leading-tight" style={{ color: ring.color.text }}>
          {fmt(value)}/{fmt(ring.goal)}
          <span className="text-sm font-semibold uppercase ml-1">{ring.unit}</span>
        </p>
        {action}
      </div>
    </div>
  );
};

const RoundButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ label, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-40 transition-colors"
  >
    {children}
  </button>
);

interface DailyRingsProps {
  eaten: RingSpec;
  burned: RingSpec;
  water: RingSpec;
  onWater: (glasses: number) => void;
  size?: number;
}

export const DailyRings: React.FC<DailyRingsProps> = ({ eaten, burned, water, onWater, size = 200 }) => (
  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
    <RingsGraphic rings={[eaten, burned, water]} size={size} />
    <div className="w-full sm:w-auto space-y-4">
      <RingValue ring={eaten} />
      <RingValue ring={burned} />
      <RingValue
        ring={water}
        action={
          <span className="flex gap-1.5">
            <RoundButton label="Remove a glass of water" onClick={() => onWater(water.value - 1)} disabled={water.value <= 0}>
              <Minus className="w-4 h-4" />
            </RoundButton>
            <RoundButton label="Add a glass of water" onClick={() => onWater(water.value + 1)}>
              <Plus className="w-4 h-4" />
            </RoundButton>
          </span>
        }
      />
    </div>
  </div>
);

export type { RingSpec };
