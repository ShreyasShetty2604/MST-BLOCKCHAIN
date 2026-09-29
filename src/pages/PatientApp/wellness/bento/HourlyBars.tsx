import React, { useState } from 'react';
import { prefersReducedMotion } from './metrics';

// 24 hourly bars (12 AM → 11 PM) like the Step Count card, with an optional dashed limit line.
// Hovering (or focusing) a bar shows its hour and value in the readout above the plot.

// Bars above the limit switch to the warning status colour (the readout and legend say it too).
const OVER_COLOR = '#F59E0B';

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

interface HourlyBarsProps {
  values: number[]; // length 24
  color: string;
  unit: string;
  limit?: { value: number; label: string }; // dashed reference line
  height?: number; // px
  nowHour?: number;
  format?: (n: number) => string;
}

export const HourlyBars: React.FC<HourlyBarsProps> = ({ values, color, unit, limit, height = 88, nowHour = new Date().getHours(), format = (n) => `${Math.round(n)}` }) => {
  const [hover, setHover] = useState<number | null>(null);
  const [grown] = useState(() => prefersReducedMotion());
  const [ready, setReady] = useState(grown);
  React.useEffect(() => {
    if (grown) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [grown]);

  const max = Math.max(1, ...values, limit ? limit.value * 1.25 : 0) * 1.08;
  const over = (v: number) => limit !== undefined && v > limit.value;

  return (
    <div className="w-full">
      <div className="h-4 mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="tabular-nums truncate" aria-live="polite">
          {hover !== null ? `${hourLabel(hover)} – ${hourLabel((hover + 1) % 24)} · ${format(values[hover])} ${unit}${over(values[hover]) ? ' · over limit' : ''}` : ''}
        </span>
        {limit && (
          <span className="shrink-0 inline-flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-slate-400" />
            {limit.label}
          </span>
        )}
      </div>
      <div className="relative" style={{ height }}>
        {/* baseline + quarter gridlines, recessive */}
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 dark:border-white/10" />
        {limit && (
          <div className="absolute inset-x-0 pointer-events-none" style={{ bottom: `${(limit.value / max) * 100}%` }}>
            <div className="border-t-2 border-dashed border-slate-400/80 dark:border-slate-400/70" />
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
          {values.map((v, h) => (
            <button
              key={h}
              type="button"
              onMouseEnter={() => setHover(h)}
              onFocus={() => setHover(h)}
              onBlur={() => setHover(null)}
              aria-label={`${hourLabel(h)}: ${format(v)} ${unit}`}
              className="relative flex-1 h-full flex items-end focus:outline-none"
            >
              <span
                className="block w-full rounded-t-[3px] rounded-b-[1px]"
                style={{
                  height: v > 0 ? `max(${ready ? (v / max) * 100 : 0}%, 3px)` : 0,
                  background: over(v) ? OVER_COLOR : color,
                  opacity: hover === null || hover === h ? 1 : 0.45,
                  transition: `height 700ms cubic-bezier(0.16, 1, 0.3, 1) ${h * 12}ms, opacity 150ms`
                }}
              />
              {h === nowHour && v === 0 && <span className="absolute bottom-0 inset-x-0 h-[3px] rounded-full bg-slate-300 dark:bg-slate-600" />}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
      </div>
    </div>
  );
};
