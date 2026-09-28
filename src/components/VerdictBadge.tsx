import React from 'react';
import { XCircle, AlertTriangle, CheckCircle2, LucideIcon } from 'lucide-react';
import { Verdict } from '../features/nutrition/mealScan';

// The only place red / amber / green are defined for food verdicts.
export const VERDICT_TONE: Record<Verdict, { icon: LucideIcon; label: string; soft: string; text: string; dot: string }> = {
  avoid: {
    icon: XCircle,
    label: 'Avoid',
    soft: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500'
  },
  caution: {
    icon: AlertTriangle,
    label: 'Caution',
    soft: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  clear: {
    icon: CheckCircle2,
    label: 'No conflicts found',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  }
};

export const VerdictBadge: React.FC<{ verdict: Verdict; label?: string; className?: string }> = ({ verdict, label, className = '' }) => {
  const tone = VERDICT_TONE[verdict];
  const Icon = tone.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${tone.soft} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label ?? tone.label}
    </span>
  );
};

export const VerdictDot: React.FC<{ verdict: Verdict; title?: string }> = ({ verdict, title }) => (
  <span title={title} className={`inline-block w-2 h-2 rounded-full shrink-0 ${VERDICT_TONE[verdict].dot}`} />
);
