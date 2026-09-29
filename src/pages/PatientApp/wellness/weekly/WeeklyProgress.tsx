import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { DayMetrics, daysInRange, addDays, mondayOf, parseYmd } from '../../../../features/nutrition/weeklyHistory';
import { DemoTag } from '../bento/BentoCard';
import {
  PeriodMode, toRows, average, withData, complete,
  CaloriesCard, RingsHistoryCard, CarbsCard, SugarCard, WeightCard, WaterCard, AdherenceCard, ScansCard
} from './WeeklyCharts';

interface WeeklyProgressProps {
  history: DayMetrics[]; // oldest → today, today already carrying the live values
  targetKcal: number;
  carbLimitG: number;
  isDiabetic: boolean;
  targetKg: number;
}

const MAX_OFFSET: Record<PeriodMode, number> = { week: 7, month: 1 }; // 8 weeks of history
const LENGTH: Record<PeriodMode, number> = { week: 7, month: 28 };

function rangeLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const month = (d: Date) => d.toLocaleDateString('en-IN', { month: 'short' });
  return sameMonth ? `${start.getDate()}–${end.getDate()} ${month(end)}` : `${start.getDate()} ${month(start)} – ${end.getDate()} ${month(end)}`;
}

// ---------------------------------------------------------------------------
// Weekly summary: highlights vs the previous period
// ---------------------------------------------------------------------------

interface Highlight {
  label: string;
  value: string;
  direction: 'up' | 'down' | 'flat';
  good: boolean | null; // null = neutral
  detail: string;
}

function pctChange(now: number | null, before: number | null): number | null {
  return now === null || before === null || before === 0 ? null : ((now - before) / before) * 100;
}

function buildHighlights(days: DayMetrics[], prev: DayMetrics[], mode: PeriodMode): Highlight[] {
  const last = `last ${mode}`;
  const dir = (n: number, eps: number) => (n > eps ? 'up' : n < -eps ? 'down' : 'flat') as Highlight['direction'];

  const carbsNow = average(days, (d) => d.carbsG);
  const carbs = pctChange(carbsNow, average(prev, (d) => d.carbsG));
  const waterNow = average(days, (d) => d.water);
  const waterPrev = average(prev, (d) => d.water);
  const water = waterNow !== null && waterPrev !== null ? waterNow - waterPrev : null;
  const steps = pctChange(average(days, (d) => d.steps), average(prev, (d) => d.steps));
  const reds = (list: DayMetrics[]) => list.flatMap((d) => d.scans).filter((s) => s.verdict === 'avoid').length;
  const redNow = reds(days);
  const redPrev = withData(prev).length ? reds(prev) : null; // scan counts include today

  return [
    {
      label: 'Carbs',
      value: carbs === null ? '—' : `${Math.abs(Math.round(carbs))}%`,
      direction: carbs === null ? 'flat' : dir(carbs, 0.5),
      good: carbs === null ? null : carbs < 0,
      detail: carbsNow === null ? 'No data yet' : `${Math.round(carbsNow)} g/day vs ${last}`
    },
    {
      label: 'Water',
      value: water === null ? '—' : `${Math.abs(water).toFixed(1)}/day`,
      direction: water === null ? 'flat' : dir(water, 0.05),
      good: water === null ? null : water > 0,
      detail: waterNow === null ? 'No data yet' : `glasses · avg ${waterNow.toFixed(1)} a day`
    },
    {
      label: 'Steps',
      value: steps === null ? '—' : `${Math.abs(Math.round(steps))}%`,
      direction: steps === null ? 'flat' : dir(steps, 0.5),
      good: steps === null ? null : steps > 0,
      detail: `vs ${last}`
    },
    {
      label: 'Red-flag meals',
      value: `${redNow}`,
      direction: redPrev === null ? 'flat' : dir(redNow - redPrev, 0),
      good: redPrev === null ? null : redNow <= redPrev,
      detail: redPrev === null ? 'Scans marked Avoid' : `${redPrev} ${last}`
    }
  ];
}

const HighlightTile: React.FC<{ h: Highlight }> = ({ h }) => {
  const Arrow = h.direction === 'up' ? ArrowUpRight : h.direction === 'down' ? ArrowDownRight : Minus;
  const tone =
    h.good === null ? 'text-slate-500 dark:text-slate-400' : h.good ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300';
  const word = h.good === null ? '' : h.good ? 'better' : 'worse';
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] p-4 min-w-0" aria-label={`${h.label} ${h.direction} ${h.value}, ${word}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h.label}</p>
      <p className="mt-1 flex items-center gap-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
        {h.label !== 'Red-flag meals' && <Arrow className={`w-5 h-5 shrink-0 ${tone}`} strokeWidth={2.5} />}
        <span className="truncate">{h.value}</span>
        {h.label === 'Red-flag meals' && h.direction !== 'flat' && <Arrow className={`w-4 h-4 shrink-0 ${tone}`} strokeWidth={2.5} />}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">{h.detail}</p>
    </div>
  );
};

// ---------------------------------------------------------------------------

export const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ history, targetKcal, carbLimitG, isDiabetic, targetKg }) => {
  const [mode, setMode] = useState<PeriodMode>('week');
  const [offset, setOffset] = useState(0);

  const today = history.length ? parseYmd(history[history.length - 1].date) : new Date();
  const len = LENGTH[mode];
  const thisMonday = mondayOf(today);
  const start = mode === 'week' ? addDays(thisMonday, -7 * offset) : addDays(thisMonday, -7 * (4 * offset + 3));
  const end = addDays(start, len - 1);

  const days = useMemo(() => daysInRange(history, start, len), [history, start.getTime(), len]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => daysInRange(history, addDays(start, -len), len), [history, start.getTime(), len]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => toRows(days, mode), [days, mode]);
  const highlights = useMemo(() => buildHighlights(days, prev, mode), [days, prev, mode]);
  const periodKey = `${mode}-${offset}`;
  const finished = complete(days).length;

  const switchMode = (m: PeriodMode) => {
    setMode(m);
    setOffset(0);
  };

  return (
    <section className="space-y-4 pt-6" aria-labelledby="wv-weekly-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="wv-weekly-title" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Weekly Progress
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{rangeLabel(start, end)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Period" className="inline-flex p-0.5 rounded-xl bg-slate-200/70 dark:bg-white/10">
            {(['week', 'month'] as PeriodMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`px-3.5 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {m === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOffset((o) => Math.min(MAX_OFFSET[mode], o + 1))}
              disabled={offset >= MAX_OFFSET[mode]}
              aria-label={`Previous ${mode}`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 dark:ring-1 dark:ring-white/10 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              aria-label={`Next ${mode}`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 dark:ring-1 dark:ring-white/10 shadow-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-35 disabled:hover:bg-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-[20px] bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:shadow-none dark:ring-1 dark:ring-white/[0.05] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{offset === 0 ? (mode === 'week' ? 'This week' : 'Last 4 weeks') : rangeLabel(start, end)} at a glance</h3>
            {finished < len && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Averages use {finished} finished day{finished === 1 ? '' : 's'} so far; today is added tonight.
              </p>
            )}
          </div>
          <DemoTag />
        </div>
        <div key={periodKey} className="wv-highlights grid gap-3 animate-fade-in">
          {highlights.map((h) => (
            <HighlightTile key={h.label} h={h} />
          ))}
        </div>
      </div>

      {/* Charts: 2 per row when there's room, 1 on phones */}
      <div className="wv-grid2" key={periodKey}>
        <CaloriesCard rows={rows} mode={mode} targetKcal={targetKcal} />
        <RingsHistoryCard rows={rows} mode={mode} targetKcal={targetKcal} />
        <CarbsCard rows={rows} mode={mode} limitG={carbLimitG} isDiabetic={isDiabetic} />
        <SugarCard rows={rows} mode={mode} />
        <WeightCard rows={rows} mode={mode} targetKg={targetKg} />
        <WaterCard rows={rows} mode={mode} />
        <AdherenceCard rows={rows} mode={mode} />
        <ScansCard rows={rows} mode={mode} />
      </div>
    </section>
  );
};
