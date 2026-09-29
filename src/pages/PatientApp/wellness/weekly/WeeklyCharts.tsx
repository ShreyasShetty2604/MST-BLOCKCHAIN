import React, { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell,
  PieChart, Pie, TooltipProps
} from 'recharts';
import { XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DayMetrics, HEATMAP_MEALS, MealAdherence, parseYmd } from '../../../../features/nutrition/weeklyHistory';
import { Verdict } from '../../../../features/nutrition/mealScan';
import { useChartTokens, ChartTokens } from '../charts/theme';
import { useMetricColors, prefersReducedMotion, fmt, GOALS } from '../bento/metrics';
import { RingsGraphic } from '../bento/DailyRings';
import { DemoTag } from '../bento/BentoCard';

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

export type PeriodMode = 'week' | 'month';

export interface ChartRow {
  date: string;
  label: string; // x-axis label
  full: string; // tooltip heading, e.g. "Wed 24 Sep"
  day: DayMetrics;
}

export function toRows(days: DayMetrics[], mode: PeriodMode): ChartRow[] {
  return days.map((d) => {
    const date = parseYmd(d.date);
    const weekday = date.toLocaleDateString('en-IN', { weekday: 'short' });
    const dm = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { date: d.date, day: d, label: mode === 'week' ? (d.isToday ? 'Today' : weekday) : dm, full: `${d.isToday ? 'Today' : weekday} ${dm}` };
  });
}

export const withData = (days: DayMetrics[]) => days.filter((d) => d.hasData);
// Finished days only: today's bar updates live, but a half-day would drag averages and counts down.
export const complete = (days: DayMetrics[]) => days.filter((d) => d.hasData && !d.isToday);
export function average(days: DayMetrics[], pick: (d: DayMetrics) => number | null): number | null {
  const values = complete(days).map(pick).filter((v): v is number => v !== null);
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}

// Charts draw in when scrolled into view (and replay when the period changes, via `key`).
function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      setSeen(true); // already on screen
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

interface WeeklyCardProps {
  title: string;
  color?: string;
  summary?: React.ReactNode;
  legend?: React.ReactNode;
  demo?: boolean;
  height?: number; // reserved plot height while the chart waits to scroll into view
  center?: boolean; // centre the content vertically (ring rows, donut) instead of sitting on the baseline
  className?: string;
  children: (visible: boolean) => React.ReactNode;
}

export const WeeklyCard: React.FC<WeeklyCardProps> = ({ title, color, summary, legend, demo = true, height = 180, center = false, className = '', children }) => {
  const [ref, visible] = useInView<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`rounded-[20px] bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:shadow-none dark:ring-1 dark:ring-white/[0.05] flex flex-col gap-3 transition-[opacity,transform] duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color }}>
            <span className={color ? '' : 'text-slate-900 dark:text-white'}>{title}</span>
          </h3>
          {summary && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{summary}</p>}
        </div>
        {demo && <DemoTag />}
      </header>
      {legend && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{legend}</div>}
      <div style={{ minHeight: height }} className={`flex-1 flex flex-col ${center ? 'justify-center' : 'justify-end'}`}>
        {visible && children(true)}
      </div>
    </section>
  );
};

export const Swatch: React.FC<{ color: string; label: string; dashed?: boolean; round?: boolean }> = ({ color, label, dashed, round }) => (
  <span className="inline-flex items-center gap-1.5">
    {dashed ? (
      <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} />
    ) : (
      <span className={`w-2.5 h-2.5 ${round ? 'rounded-full' : 'rounded-[3px]'}`} style={{ background: color }} />
    )}
    {label}
  </span>
);

const TipBox: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl bg-white dark:bg-slate-800 shadow-card-hover ring-1 ring-slate-900/5 dark:ring-white/10 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 space-y-0.5">
    <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
    {children}
  </div>
);

// Recharts hands tooltip payload rows back untyped; each chart reads its own fields.
type TipProps = TooltipProps<number, string>;

function axes(t: ChartTokens, mode: PeriodMode) {
  return {
    x: {
      dataKey: 'label',
      tick: { fill: t.muted, fontSize: 11 },
      axisLine: { stroke: t.grid },
      tickLine: false,
      interval: mode === 'week' ? 0 : 6,
      minTickGap: 0
    } as const,
    y: { tick: { fill: t.muted, fontSize: 11 }, axisLine: false, tickLine: false, width: 40 } as const
  };
}

const animate = () => !prefersReducedMotion();
const tipCursor = (t: ChartTokens) => ({ fill: t.accentWash });

// ---------------------------------------------------------------------------
// 1. Calories: eaten vs burned, target as a dashed line
// ---------------------------------------------------------------------------

export const CaloriesCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode; targetKcal: number }> = ({ rows, mode, targetKcal }) => {
  const t = useChartTokens();
  const c = useMetricColors();
  const a = axes(t, mode);
  const days = rows.map((r) => r.day);
  const logged = complete(days);
  const onTarget = logged.filter((d) => Math.abs((d.eatenKcal ?? 0) - targetKcal) <= targetKcal * 0.1).length;
  const avg = average(days, (d) => d.eatenKcal);
  const data = rows.map((r) => ({ ...r, eaten: r.day.eatenKcal, burned: r.day.burnedKcal }));
  return (
    <WeeklyCard
      title="Calories"
      color={c.eaten.text}
      summary={avg === null ? 'No data for this period' : `Avg ${fmt(avg)} kcal/day · ${onTarget} of ${logged.length} days on target`}
      legend={
        <>
          <Swatch color={c.eaten.ring} label="Eaten" />
          <Swatch color={c.burned.ring} label="Burned" />
          <Swatch color={t.axis} label={`Target ${fmt(targetKcal)}`} dashed />
        </>
      }
    >
      {() => (
        <div className="relative flex-1 min-h-[12rem] -ml-2">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap={mode === 'week' ? '22%' : '12%'} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis {...a.x} />
              <YAxis {...a.y} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)} />
              <Tooltip
                cursor={tipCursor(t)}
                content={({ active, payload }: TipProps) =>
                  active && payload?.length && payload[0].payload.day.hasData ? (
                    <TipBox title={payload[0].payload.full}>
                      <p>Eaten {fmt(payload[0].payload.eaten ?? 0)} kcal</p>
                      <p>Burned {fmt(payload[0].payload.burned ?? 0)} kcal</p>
                      <p className="text-slate-500">
                        {(payload[0].payload.eaten ?? 0) - targetKcal >= 0 ? '+' : ''}
                        {fmt((payload[0].payload.eaten ?? 0) - targetKcal)} vs target
                      </p>
                    </TipBox>
                  ) : null
                }
              />
              <ReferenceLine y={targetKcal} stroke={t.axis} strokeDasharray="4 4" strokeWidth={1.5} ifOverflow="extendDomain" />
              <Bar dataKey="eaten" fill={c.eaten.ring} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={animate()} animationDuration={700} />
              <Bar dataKey="burned" fill={c.burned.ring} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={animate()} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 2. Rings history: one mini ring set per day; tap for that day's numbers
// ---------------------------------------------------------------------------

export const RingsHistoryCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode; targetKcal: number }> = ({ rows, mode, targetKcal }) => {
  const c = useMetricColors();
  const initial = rows.find((r) => r.day.isToday) ?? [...rows].reverse().find((r) => r.day.hasData) ?? rows[rows.length - 1];
  const [selected, setSelected] = useState(initial.date);
  const sel = rows.find((r) => r.date === selected) ?? initial;
  const closed = complete(rows.map((r) => r.day)).filter(
    (d) => (d.eatenKcal ?? 0) >= targetKcal * 0.9 && (d.burnedKcal ?? 0) >= GOALS.burnedKcal && (d.water ?? 0) >= GOALS.water
  ).length;
  const size = mode === 'week' ? 44 : 30;
  const ringsFor = (d: DayMetrics) => [
    { id: 'eaten', label: 'Eaten', value: d.eatenKcal ?? 0, goal: targetKcal, unit: 'kcal', color: c.eaten },
    { id: 'burned', label: 'Burned', value: d.burnedKcal ?? 0, goal: GOALS.burnedKcal, unit: 'kcal', color: c.burned },
    { id: 'water', label: 'Water', value: d.water ?? 0, goal: GOALS.water, unit: 'glasses', color: c.water }
  ];
  return (
    <WeeklyCard title="Rings history" summary={`All three rings closed on ${closed} day${closed === 1 ? '' : 's'}`} height={150} center>
      {() => (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-y-3 gap-x-1">
            {rows.map((r) => {
              const isSel = r.date === sel.date;
              return (
                <button
                  key={r.date}
                  type="button"
                  onClick={() => setSelected(r.date)}
                  disabled={!r.day.hasData}
                  aria-pressed={isSel}
                  aria-label={`${r.full}${r.day.hasData ? '' : ', no data'}`}
                  className={`flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                    isSel ? 'bg-slate-100 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  } ${r.day.hasData ? '' : 'opacity-35 cursor-default'}`}
                >
                  <span className={`text-[10px] font-semibold ${r.day.isToday ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {mode === 'week' ? r.label : parseYmd(r.date).getDate()}
                  </span>
                  <RingsGraphic rings={ringsFor(r.day)} size={size} />
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-4 py-3">
            <p className="text-xs font-semibold text-slate-900 dark:text-white">{sel.full}</p>
            {sel.day.hasData ? (
              <div className="mt-1 grid grid-cols-3 gap-2">
                {ringsFor(sel.day).map((ring) => (
                  <div key={ring.id} className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{ring.label}</p>
                    <p className="text-[13px] font-bold tabular-nums truncate" style={{ color: ring.color.text }} title={`${fmt(ring.value)} of ${fmt(ring.goal)} ${ring.unit}`}>
                      {fmt(ring.value)}
                      <span className="font-semibold opacity-70">/{fmt(ring.goal)}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">No data for this day.</p>
            )}
          </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 3. Carbs: bars coloured by how far over the daily limit
// ---------------------------------------------------------------------------

type CarbStatus = 'under' | 'slightly' | 'well';
const carbStatus = (g: number, limit: number): CarbStatus => (g <= limit ? 'under' : g <= limit * 1.15 ? 'slightly' : 'well');
const CARB_TEXT: Record<CarbStatus, string> = { under: 'Under limit', slightly: 'Slightly over', well: 'Well over' };

export const CarbsCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode; limitG: number; isDiabetic: boolean }> = ({ rows, mode, limitG, isDiabetic }) => {
  const t = useChartTokens();
  const c = useMetricColors();
  const a = axes(t, mode);
  const tone: Record<CarbStatus, string> = { under: t.status.good, slightly: t.status.warn, well: t.status.bad };
  const days = rows.map((r) => r.day);
  const logged = complete(days);
  const under = logged.filter((d) => (d.carbsG ?? 0) <= limitG).length;
  const avg = average(days, (d) => d.carbsG);
  const data = rows.map((r) => ({ ...r, carbs: r.day.carbsG }));
  const limitLabel = isDiabetic ? 'Diabetic limit' : 'Daily target';
  return (
    <WeeklyCard
      title="Carbs"
      color={c.carbs.text}
      summary={avg === null ? 'No data for this period' : `Avg ${fmt(avg)} g/day · ${under} of ${logged.length} days under ${fmt(limitG)} g`}
      legend={
        <>
          <Swatch color={tone.under} label="Under" />
          <Swatch color={tone.slightly} label="≤ 15% over" />
          <Swatch color={tone.well} label="Well over" />
          <Swatch color={t.axis} label={`${limitLabel} ${fmt(limitG)} g`} dashed />
        </>
      }
    >
      {() => (
        <div className="relative flex-1 min-h-[12rem] -ml-2">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={mode === 'week' ? '30%' : '15%'} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis {...a.x} />
              <YAxis {...a.y} />
              <Tooltip
                cursor={tipCursor(t)}
                content={({ active, payload }: TipProps) => {
                  const row = payload?.[0]?.payload;
                  if (!active || !row?.day.hasData) return null;
                  const g = row.carbs ?? 0;
                  return (
                    <TipBox title={row.full}>
                      <p>{fmt(g)} g carbs</p>
                      <p className="text-slate-500">
                        {CARB_TEXT[carbStatus(g, limitG)]}
                        {g > limitG ? ` · +${fmt(g - limitG)} g` : ''}
                      </p>
                    </TipBox>
                  );
                }}
              />
              <ReferenceLine y={limitG} stroke={t.axis} strokeDasharray="4 4" strokeWidth={1.5} ifOverflow="extendDomain" />
              <Bar dataKey="carbs" radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={animate()} animationDuration={700}>
                {data.map((d) => (
                  <Cell key={d.date} fill={tone[carbStatus(d.carbs ?? 0, limitG)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 4. Fasting blood sugar, with the 80–130 mg/dL target band
// ---------------------------------------------------------------------------

const SUGAR_LOW = 80;
const SUGAR_HIGH = 130;
const sugarTone = (v: number, t: ChartTokens) => (v >= SUGAR_LOW && v <= SUGAR_HIGH ? t.status.good : v < 70 || v > 180 ? t.status.bad : t.status.warn);
const sugarText = (v: number) => (v >= SUGAR_LOW && v <= SUGAR_HIGH ? 'In range' : v < SUGAR_LOW ? 'Below range' : v > 180 ? 'Well above range' : 'Above range');

export const SugarCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode }> = ({ rows, mode }) => {
  const t = useChartTokens();
  const a = axes(t, mode);
  const data = rows.map((r) => ({ ...r, glucose: r.day.glucose }));
  const values = data.map((d) => d.glucose).filter((v): v is number => v !== null);
  const inRange = values.filter((v) => v >= SUGAR_LOW && v <= SUGAR_HIGH).length;
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  const yMax = Math.max(180, ...values) + 10;

  const Dot = (props: { cx?: number; cy?: number; payload?: { glucose: number | null; date: string } }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.glucose == null) return <g key={payload?.date} />;
    return <circle key={payload.date} cx={cx} cy={cy} r={mode === 'week' ? 5 : 3.5} fill={sugarTone(payload.glucose, t)} stroke={t.surface} strokeWidth={2} />;
  };

  return (
    <WeeklyCard
      title="Blood sugar (fasting)"
      summary={avg === null ? 'No readings for this period' : `Avg ${Math.round(avg)} mg/dL · ${inRange} of ${values.length} in range`}
      legend={
        <>
          <Swatch color={t.status.good} label="80–130 in range" round />
          <Swatch color={t.status.warn} label="Above/below" round />
          <Swatch color={t.status.bad} label="> 180 or < 70" round />
        </>
      }
    >
      {() => (
        <div className="relative flex-1 min-h-[12rem] -ml-2">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <ReferenceArea y1={SUGAR_LOW} y2={SUGAR_HIGH} fill={t.status.goodWash} stroke="none" ifOverflow="extendDomain" />
              <XAxis {...a.x} />
              <YAxis {...a.y} domain={[60, yMax]} ticks={[70, 100, 130, 160, 190, 220].filter((v) => v <= yMax)} />
              <Tooltip
                cursor={{ stroke: t.axis, strokeWidth: 1 }}
                content={({ active, payload }: TipProps) => {
                  const row = payload?.[0]?.payload;
                  if (!active || row?.glucose == null) return null;
                  return (
                    <TipBox title={row.full}>
                      <p>{row.glucose} mg/dL fasting</p>
                      <p style={{ color: sugarTone(row.glucose, t) }} className="font-medium">
                        {sugarText(row.glucose)}
                      </p>
                    </TipBox>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke={t.axis}
                strokeWidth={2}
                dot={<Dot />}
                activeDot={{ r: 6, stroke: t.surface, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={animate()}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 5. Weight, with target line and a change badge
// ---------------------------------------------------------------------------

export const WeightCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode; targetKg: number }> = ({ rows, mode, targetKg }) => {
  const t = useChartTokens();
  const a = axes(t, mode);
  const data = rows.map((r) => ({ ...r, weight: r.day.weightKg }));
  const values = data.map((d) => d.weight).filter((v): v is number => v !== null);
  const change = values.length > 1 ? Math.round((values[values.length - 1] - values[0]) * 10) / 10 : null;
  const current = values[values.length - 1];
  const toward = change !== null && change !== 0 && (current > targetKg ? change < 0 : change > 0);
  const lo = Math.floor(Math.min(targetKg, ...values) - 1);
  const hi = Math.ceil(Math.max(targetKg, ...values) + 0.5);

  const badge =
    change === null ? null : (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
          toward ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
        }`}
      >
        {change > 0 ? '+' : change < 0 ? '−' : ''}
        {Math.abs(change).toFixed(1)} kg this {mode}
      </span>
    );

  return (
    <WeeklyCard
      title="Weight"
      summary={
        values.length ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {current} kg now {badge}
          </span>
        ) : (
          'No data for this period'
        )
      }
      legend={
        <>
          <Swatch color={t.accent} label="Weight" />
          <Swatch color={t.axis} label={`Target ${targetKg} kg`} dashed />
        </>
      }
    >
      {() => (
        <div className="relative flex-1 min-h-[12rem] -ml-2">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis {...a.x} />
              <YAxis {...a.y} domain={[lo, hi]} tickFormatter={(v) => `${v}`} />
              <Tooltip
                cursor={{ stroke: t.axis, strokeWidth: 1 }}
                content={({ active, payload }: TipProps) => {
                  const row = payload?.[0]?.payload;
                  if (!active || row?.weight == null) return null;
                  return (
                    <TipBox title={row.full}>
                      <p>{row.weight} kg</p>
                      <p className="text-slate-500">{Math.abs(row.weight - targetKg).toFixed(1)} kg from target</p>
                    </TipBox>
                  );
                }}
              />
              <ReferenceLine y={targetKg} stroke={t.axis} strokeDasharray="4 4" strokeWidth={1.5} ifOverflow="extendDomain" />
              <Line
                type="monotone"
                dataKey="weight"
                stroke={t.accent}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: t.accent, stroke: t.surface, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={animate()}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 6. Water: glasses per day vs the 8-glass goal
// ---------------------------------------------------------------------------

export const WaterCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode }> = ({ rows, mode }) => {
  const t = useChartTokens();
  const c = useMetricColors();
  const a = axes(t, mode);
  const days = rows.map((r) => r.day);
  const logged = complete(days);
  const atGoal = logged.filter((d) => (d.water ?? 0) >= GOALS.water).length;
  const avg = average(days, (d) => d.water);
  const data = rows.map((r) => ({ ...r, water: r.day.water }));
  return (
    <WeeklyCard
      title="Water"
      color={c.water.text}
      summary={avg === null ? 'No data for this period' : `Avg ${avg.toFixed(1)} glasses/day · ${atGoal} of ${logged.length} days at goal`}
      legend={
        <>
          <Swatch color={c.water.ring} label="Glasses" />
          <Swatch color={t.axis} label={`Goal ${GOALS.water}`} dashed />
        </>
      }
    >
      {() => (
        <div className="relative flex-1 min-h-[12rem] -ml-2">
          <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap={mode === 'week' ? '30%' : '15%'} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={t.grid} />
              <XAxis {...a.x} />
              <YAxis {...a.y} allowDecimals={false} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
              <Tooltip
                cursor={tipCursor(t)}
                content={({ active, payload }: TipProps) => {
                  const row = payload?.[0]?.payload;
                  if (!active || !row?.day.hasData) return null;
                  return (
                    <TipBox title={row.full}>
                      <p>
                        {row.water} of {GOALS.water} glasses · {(((row.water ?? 0) * 250) / 1000).toFixed(2)} L
                      </p>
                    </TipBox>
                  );
                }}
              />
              <ReferenceLine y={GOALS.water} stroke={t.axis} strokeDasharray="4 4" strokeWidth={1.5} />
              <Bar dataKey="water" fill={c.water.ring} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={animate()} animationDuration={700} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 7. Meal-plan adherence heatmap: meals × days
// ---------------------------------------------------------------------------

const ADHERENCE_TEXT: Record<MealAdherence, string> = {
  followed: 'Followed plan',
  partly: 'Partly followed',
  off: 'Skipped or off-plan',
  none: 'Not logged'
};

export const AdherenceCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode }> = ({ rows, mode }) => {
  const t = useChartTokens();
  const tone: Record<MealAdherence, string> = { followed: t.status.good, partly: t.status.warn, off: t.status.bad, none: t.track };
  const [focus, setFocus] = useState<string | null>(null);
  const cells = withData(rows.map((r) => r.day)).flatMap((d) => HEATMAP_MEALS.map((m) => d.meals[m])).filter((s) => s !== 'none');
  const followed = cells.filter((s) => s === 'followed').length;
  const pct = cells.length ? Math.round((followed / cells.length) * 100) : null;
  return (
    <WeeklyCard
      title="Meal plan adherence"
      summary={pct === null ? 'No meals logged' : `${pct}% of logged meals followed the plan`}
      legend={
        <>
          <Swatch color={tone.followed} label="Followed" />
          <Swatch color={tone.partly} label="Partly" />
          <Swatch color={tone.off} label="Skipped / off-plan" />
          <Swatch color={tone.none} label="Not logged" />
        </>
      }
      height={170}
      center
    >
      {() => (
        <div className="space-y-2">
          <p className="h-4 text-[11px] font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
            {focus ?? ''}
          </p>
          <div className="grid gap-1" style={{ gridTemplateColumns: `4.5rem repeat(${rows.length}, minmax(0, 1fr))` }} onMouseLeave={() => setFocus(null)}>
            {HEATMAP_MEALS.map((meal) => (
              <React.Fragment key={meal}>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 self-center truncate">{meal}</span>
                {rows.map((r, i) => {
                  const state = r.day.hasData ? r.day.meals[meal] : 'none';
                  const text = `${r.full} · ${meal}: ${r.day.hasData ? ADHERENCE_TEXT[state] : 'No data'}`;
                  return (
                    <button
                      key={r.date}
                      type="button"
                      title={text}
                      aria-label={text}
                      onMouseEnter={() => setFocus(text)}
                      onFocus={() => setFocus(text)}
                      onClick={() => setFocus(text)}
                      className={`${mode === 'week' ? 'h-7 rounded-lg' : 'h-5 rounded-[4px]'} transition-transform duration-150 hover:scale-110 wv-pop ${r.day.hasData ? '' : 'opacity-40'}`}
                      style={{ background: tone[state], animationDelay: `${i * 25}ms` }}
                    />
                  );
                })}
              </React.Fragment>
            ))}
            <span />
            {rows.map((r, i) => (
              <span key={r.date} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {mode === 'week' ? r.label.slice(0, 3) : i % 7 === 0 ? parseYmd(r.date).getDate() : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </WeeklyCard>
  );
};

// ---------------------------------------------------------------------------
// 8. Meal scans: verdict donut + most-flagged category
// ---------------------------------------------------------------------------

const VERDICT_META: Record<Verdict, { label: string; icon: typeof XCircle }> = {
  avoid: { label: 'Avoid', icon: XCircle },
  caution: { label: 'Caution', icon: AlertTriangle },
  clear: { label: 'No flags', icon: CheckCircle2 }
};

export const ScansCard: React.FC<{ rows: ChartRow[]; mode: PeriodMode }> = ({ rows, mode }) => {
  const t = useChartTokens();
  const tone: Record<Verdict, string> = { avoid: t.status.bad, caution: t.status.warn, clear: t.status.good };
  const scans = rows.flatMap((r) => r.day.scans);
  const counts = (['avoid', 'caution', 'clear'] as Verdict[]).map((v) => ({ verdict: v, count: scans.filter((s) => s.verdict === v).length }));
  const flags = scans.reduce<Record<string, number>>((m, s) => (s.flag ? { ...m, [s.flag]: (m[s.flag] ?? 0) + 1 } : m), {});
  const top = Object.entries(flags).sort((a, b) => b[1] - a[1])[0];
  return (
    <WeeklyCard
      title="Meal scans"
      summary={scans.length ? `${scans.length} meal${scans.length === 1 ? '' : 's'} scanned this ${mode}` : `No meals scanned this ${mode}`}
      height={150}
      center
    >
      {() =>
        scans.length ? (
          <div className="flex items-center gap-6">
            <div className="relative w-[128px] h-[128px] shrink-0">
              <PieChart width={128} height={128}>
                <Pie
                  data={counts.filter((c) => c.count > 0)}
                  dataKey="count"
                  nameKey="verdict"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={3}
                  stroke={t.surface}
                  strokeWidth={2}
                  isAnimationActive={animate()}
                  animationDuration={800}
                >
                  {counts
                    .filter((c) => c.count > 0)
                    .map((c) => (
                      <Cell key={c.verdict} fill={tone[c.verdict]} />
                    ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: TipProps) =>
                    active && payload?.length ? (
                      <TipBox title={VERDICT_META[payload[0].payload.verdict as Verdict].label}>
                        <p>
                          {payload[0].payload.count} meal{payload[0].payload.count === 1 ? '' : 's'}
                        </p>
                      </TipBox>
                    ) : null
                  }
                />
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{scans.length}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">scans</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <ul className="space-y-1.5">
                {counts.map(({ verdict, count }) => {
                  const Icon = VERDICT_META[verdict].icon;
                  return (
                    <li key={verdict} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 shrink-0" style={{ color: tone[verdict] }} />
                      <span className="flex-1 text-slate-600 dark:text-slate-300">{VERDICT_META[verdict].label}</span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{count}</span>
                    </li>
                  );
                })}
              </ul>
              {top && (
                <p className="pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                  Most flagged: <span className="font-semibold text-slate-800 dark:text-slate-100">{top[0]}</span> ({top[1]}×)
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Scan a meal before you eat to see your verdicts here.</p>
        )
      }
    </WeeklyCard>
  );
};
