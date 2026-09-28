import React, { useEffect, useState } from 'react';
import { DerivedCheckup } from '../../../../features/nutrition/recordInsights';
import { useChartTokens } from './theme';

// Ring = time remaining in the checkup interval. Green → amber (≤ 30 days) → red (overdue).
// The status also shows as text in the centre and in the card's pill, so it's never colour-alone.
export const CheckupRing: React.FC<{ checkup: DerivedCheckup }> = ({ checkup }) => {
  const t = useChartTokens();
  const intervalDays = Math.max(1, checkup.intervalMonths * 30.4);
  const noReport = !/^\d{4}-/.test(checkup.lastDoneDate);
  const remaining = noReport ? 0 : Math.min(1, Math.max(0, checkup.daysRemaining / intervalDays));
  const color = checkup.daysRemaining < 0 || noReport ? t.status.bad : checkup.daysRemaining <= 30 ? t.status.warn : t.status.good;

  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(noReport || checkup.daysRemaining < 0 ? 1 : remaining));
    return () => cancelAnimationFrame(id);
  }, [remaining, noReport, checkup.daysRemaining]);

  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const centre = noReport ? '!' : checkup.daysRemaining < 0 ? `${-checkup.daysRemaining}d` : `${checkup.daysRemaining}d`;
  const label = noReport
    ? 'No report on record'
    : checkup.daysRemaining < 0
    ? `Overdue by ${-checkup.daysRemaining} days`
    : `${checkup.daysRemaining} days until due`;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold text-slate-900 dark:text-white">
        {centre}
      </span>
    </div>
  );
};
