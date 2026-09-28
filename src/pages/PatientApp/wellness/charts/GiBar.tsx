import React from 'react';
import { GiLevel } from '../../../../features/nutrition/dietPlan';

// Three-step glycaemic-index meter; the filled steps carry the status colour, the label says it too.
const LEVELS: Record<GiLevel, { filled: number; color: string; text: string }> = {
  Low: { filled: 1, color: 'bg-emerald-500', text: 'Low GI' },
  Med: { filled: 2, color: 'bg-amber-500', text: 'Medium GI' },
  High: { filled: 3, color: 'bg-rose-500', text: 'High GI' }
};

export const GiBar: React.FC<{ gi: GiLevel }> = ({ gi }) => {
  const level = LEVELS[gi];
  return (
    <div className="flex items-center gap-2" title={level.text} aria-label={level.text}>
      <div className="flex gap-0.5 w-16">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1.5 flex-1 first:rounded-l-full last:rounded-r-full ${i < level.filled ? level.color : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{level.text}</span>
    </div>
  );
};
