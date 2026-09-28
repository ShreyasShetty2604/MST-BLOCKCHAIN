import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useChartTokens } from './theme';

export interface MacroRow {
  name: 'Carbs' | 'Protein' | 'Fat';
  grams: number; // today's intake (inner donut)
  percent: number; // share of today's intake
  targetPercent: number; // plan target (thin outer ring)
}

// Inner donut: today's intake by macro. Thin outer ring: the target split, for comparison.
// Fixed size (no responsive container) so it always paints when a tab mounts.
export const MacroDonut: React.FC<{ rows: MacroRow[]; targetLabel: string }> = ({ rows, targetLabel }) => {
  const t = useChartTokens();
  const total = rows.reduce((s, r) => s + r.grams, 0);

  const tooltip = ({ active, payload }: { active?: boolean; payload?: { payload: MacroRow & { ring: string } }[] }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-xl bg-white dark:bg-slate-800 shadow-card-hover px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
        <p className="font-semibold">{row.name}</p>
        {row.ring === 'target' ? <p>Target {row.targetPercent}%</p> : <p>{row.grams} g · {row.percent}% of today</p>}
      </div>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-[180px] h-[180px] shrink-0">
        <PieChart width={180} height={180}>
          <Pie
            data={rows.map((r) => ({ ...r, ring: 'today' }))}
            dataKey="grams"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            stroke={t.surface}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {rows.map((r) => (
              <Cell key={r.name} fill={t.macro[r.name]} />
            ))}
          </Pie>
          <Pie
            data={rows.map((r) => ({ ...r, ring: 'target' }))}
            dataKey="targetPercent"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={78}
            outerRadius={82}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {rows.map((r) => (
              <Cell key={r.name} fill={t.macro[r.name]} fillOpacity={0.55} />
            ))}
          </Pie>
          <Tooltip content={tooltip as never} />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-semibold text-slate-900 dark:text-white">{total} g</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">today</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 dark:text-slate-400">
            <th className="text-left font-medium pb-2">Macro</th>
            <th className="text-right font-medium pb-2">Today</th>
            <th className="text-right font-medium pb-2 pl-4">{targetLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="py-1.5">
                <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.macro[r.name] }} />
                  {r.name}
                </span>
              </td>
              <td className="py-1.5 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                {r.grams} g <span className="font-normal text-slate-500 dark:text-slate-400">· {r.percent}%</span>
              </td>
              <td className="py-1.5 pl-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">{r.targetPercent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
