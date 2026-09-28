import React from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useChartTokens } from './theme';

// Compact 12-week weight trend with a solid hairline target (dashed rules read as noise).
export const WeightSparkline: React.FC<{ points: { week: string; value: number }[]; targetKg: number }> = ({ points, targetKg }) => {
  const t = useChartTokens();
  const values = points.map((p) => p.value);
  const lo = Math.floor(Math.min(targetKg, ...values) - 1);
  const hi = Math.ceil(Math.max(targetKg, ...values) + 1);
  const current = values[values.length - 1];
  const change = Math.round((current - values[0]) * 10) / 10;

  const tip = ({ active, payload }: { active?: boolean; payload?: { payload: { week: string; value: number } }[] }) =>
    active && payload?.length ? (
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-card-hover px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
        <p className="font-semibold">{payload[0].payload.value} kg</p>
        <p className="text-slate-500">Week {payload[0].payload.week.slice(1)}</p>
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          {current}
          <span className="text-sm font-medium text-slate-400"> kg</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {change > 0 ? '+' : ''}
          {change} kg in 12 weeks · target {targetKg} kg
        </span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <YAxis hide domain={[lo, hi]} />
            <ReferenceLine
              y={targetKg}
              stroke={t.axis}
              strokeWidth={1}
              label={{ value: `Target ${targetKg} kg`, position: 'insideBottomLeft', fill: t.muted, fontSize: 11 }}
            />
            <Tooltip content={tip as never} cursor={{ stroke: t.axis, strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={t.accent}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: t.accent, stroke: t.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
