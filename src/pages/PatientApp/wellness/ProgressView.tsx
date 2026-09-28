import React from 'react';
import { Activity } from 'lucide-react';
import { Hba1cPoint, AdherenceDay } from '../../../features/nutrition/demoProgress';
import { Card, Label, IconTile, DemoLabel, Disclosure, Skeleton } from './ui';
import { Hba1cTrend } from './charts/Hba1cTrend';
import { WeightSparkline } from './charts/WeightSparkline';
import { AdherenceHeatmap } from './charts/AdherenceHeatmap';

interface ProgressViewProps {
  hba1c: Hba1cPoint[] | null; // null while records load
  weight: { points: { week: string; value: number }[]; targetKg: number };
  adherence: AdherenceDay[];
  mealTypes: string[];
}

export const ProgressView: React.FC<ProgressViewProps> = ({ hba1c, weight, adherence, mealTypes }) => (
  <div className="space-y-8">
    <Card>
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">HbA1c · last 12 months</h3>
          <Label>Shaded band = target below 7%</Label>
        </div>
        <Label>Demo history · latest point from your Records</Label>
      </div>

      {hba1c === null ? (
        <Skeleton className="h-56 w-full rounded-2xl" />
      ) : hba1c.length === 0 ? (
        <div className="flex items-center gap-4">
          <IconTile icon={Activity} />
          <p className="text-sm text-slate-500 dark:text-slate-400">No HbA1c readings yet. Add a report on the Records page to see your trend.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Hba1cTrend points={hba1c} />
          <Disclosure summary={<span className="text-sm">View as table</span>}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400">
                  <th className="text-left font-medium pb-2">Date</th>
                  <th className="text-right font-medium pb-2">HbA1c</th>
                  <th className="text-left font-medium pb-2 pl-4">Source</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {hba1c.map((p) => (
                  <tr key={p.date}>
                    <td className="py-1">{p.date}</td>
                    <td className="py-1 text-right tabular-nums font-semibold">{p.value}%</td>
                    <td className="py-1 pl-4">
                      {p.verified ? '✓ Verified · ' : ''}
                      {p.source}
                      {p.demo && <span className="text-slate-400"> · demo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        </div>
      )}
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <Card className="h-full">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Weight · 12 weeks</h3>
          <DemoLabel />
        </div>
        <WeightSparkline points={weight.points} targetKg={weight.targetKg} />
      </Card>

      <Card className="h-full">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">This week's plan adherence</h3>
          <DemoLabel />
        </div>
        <AdherenceHeatmap days={adherence} mealTypes={mealTypes} />
      </Card>
    </div>
  </div>
);
