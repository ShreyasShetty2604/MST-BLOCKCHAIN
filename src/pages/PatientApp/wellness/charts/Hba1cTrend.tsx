import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea } from 'recharts';
import { Hba1cPoint } from '../../../../features/nutrition/demoProgress';
import { useChartTokens } from './theme';

const fmtMonth = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

// One series (HbA1c %), so no legend box; the marker key below explains filled vs hollow points.
export const Hba1cTrend: React.FC<{ points: Hba1cPoint[] }> = ({ points }) => {
  const t = useChartTokens();
  const data = points.map((p) => ({ ...p, label: fmtMonth(p.date) }));
  const values = points.map((p) => p.value);
  const yMin = Math.floor(Math.min(6, ...values) - 0.5);
  const yMax = Math.ceil(Math.max(...values) + 0.5);
  const last = data[data.length - 1];

  const Dot = (props: { cx?: number; cy?: number; payload?: Hba1cPoint; index?: number }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return null;
    return (
      <circle
        key={props.index}
        cx={cx}
        cy={cy}
        r={5}
        fill={payload.verified ? t.accent : t.surface}
        stroke={payload.verified ? t.surface : t.accent}
        strokeWidth={2}
      />
    );
  };

  const tip = ({ active, payload }: { active?: boolean; payload?: { payload: Hba1cPoint & { label: string } }[] }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-card-hover px-3 py-2 text-xs text-slate-700 dark:text-slate-200 space-y-0.5">
        <p className="font-semibold text-sm">{p.value}%</p>
        <p>{new Date(`${p.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <p className={p.verified ? 'text-teal-700 dark:text-teal-300 font-medium' : 'text-slate-500'}>
          {p.verified ? '✓ Verified' : 'Not verified'} · {p.source}
        </p>
        {p.demo && <p className="text-slate-400">Demo data</p>}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="h-56 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 40, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={t.grid} strokeWidth={1} />
            <ReferenceArea y1={yMin} y2={7} fill={t.status.goodWash} stroke="none" ifOverflow="extendDomain" label={{ value: 'Target < 7%', position: 'insideBottomLeft', fill: t.muted, fontSize: 11 }} />
            <XAxis dataKey="label" tick={{ fill: t.muted, fontSize: 11 }} axisLine={{ stroke: t.grid }} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tick={{ fill: t.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={tip as never} cursor={{ stroke: t.axis, strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={t.accent}
              strokeWidth={2}
              dot={<Dot />}
              activeDot={{ r: 6, fill: t.accent, stroke: t.surface, strokeWidth: 2 }}
              isAnimationActive={false}
              label={({ x, y, index }: { x: number; y: number; index: number }) =>
                index === data.length - 1 ? (
                  <text key="end" x={x + 10} y={y} dominantBaseline="middle" fontSize={12} fontWeight={600} fill={t.ink}>
                    {last.value}%
                  </text>
                ) : (
                  <g key={index} />
                )
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-700 dark:bg-teal-400" /> ✓ Verified (hospital record)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-teal-700 dark:border-teal-400" /> Not verified
        </span>
      </div>
    </div>
  );
};
