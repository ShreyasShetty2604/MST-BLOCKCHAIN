import React from 'react';
import { Sunrise, Sun, Apple, Moon, Coffee, LucideIcon } from 'lucide-react';
import { CheckupReminder } from '../../../mock/types';

export const MEAL_ICONS: Record<string, LucideIcon> = {
  Breakfast: Sunrise,
  'Mid-morning': Apple,
  Lunch: Sun,
  Snack: Coffee,
  Dinner: Moon
};

// Checkup status: red / amber are warnings; "up to date" stays neutral.
// Short labels so the pill never wraps; the full dates are shown in the card itself.
function shortLabel(c: Pick<CheckupReminder, 'dueState' | 'dueStateLabel' | 'lastDoneDate'>): string {
  if (c.dueState === 'done') return 'Up to date';
  if (!/^\d{4}-/.test(c.lastDoneDate)) return 'No report yet';
  return c.dueStateLabel;
}

export const DueStatus: React.FC<{ checkup: Pick<CheckupReminder, 'dueState' | 'dueStateLabel' | 'lastDoneDate'> }> = ({ checkup }) => (
  <span
    className={`inline-flex w-fit shrink-0 whitespace-nowrap items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      checkup.dueState === 'overdue'
        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
        : checkup.dueState === 'due'
        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
    }`}
  >
    {shortLabel(checkup)}
  </span>
);
