import React from 'react';
import { CalendarClock, ScanLine, ChevronRight, Camera, Stethoscope } from 'lucide-react';
import { PlannedMeal } from '../../../features/nutrition/dietPlan';
import { DerivedCheckup } from '../../../features/nutrition/recordInsights';
import { Card, Label, IconTile, Skeleton, DemoLabel } from './ui';
import { DueStatus } from './shared';
import { BmiGauge } from './charts/BmiGauge';
import { ActivityRings, MacroProgress } from './charts/ActivityRings';
import { WaterTracker } from './charts/WaterTracker';
import { MealTimeline } from './charts/MealTimeline';

export type WellnessTabId = 'today' | 'scan' | 'plan' | 'progress' | 'checkups';

interface TodayViewProps {
  personaId: string;
  bmi: number;
  targetCalories: number | null; // null when a dietitian sets the target
  eatenCalories: number;
  macroProgress: MacroProgress[];
  meals: PlannedMeal[] | null;
  logged: Set<string>;
  nextCheckup: DerivedCheckup | undefined;
  checkupsLoading: boolean;
  scansToday: number;
  onNavigate: (tab: WellnessTabId) => void;
}

const CardHead: React.FC<{ title: string; hint?: React.ReactNode }> = ({ title, hint }) => (
  <div className="flex items-baseline justify-between gap-3 mb-5">
    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
    {hint}
  </div>
);

export const TodayView: React.FC<TodayViewProps> = (p) => (
  <div className="space-y-8">
    {/* Row 1: BMI gauge + calorie rings */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <Card className="h-full">
        <CardHead title="BMI" hint={<Label>Asian cut-offs</Label>} />
        <BmiGauge bmi={p.bmi} />
      </Card>

      <Card className="h-full flex flex-col">
        <CardHead title="Calories today" hint={<DemoLabel />} />
        {p.targetCalories === null ? (
          <div className="flex-1 flex items-center gap-4">
            <IconTile icon={Stethoscope} />
            <p className="text-sm text-slate-500 dark:text-slate-400">Your calorie target is set by your dietitian for your condition.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center gap-4">
            <ActivityRings eaten={p.eatenCalories} target={p.targetCalories} macros={p.macroProgress} />
            {p.eatenCalories === 0 && <Label>Nothing logged yet today — your first meal is at {p.meals?.[0]?.time ?? '8:30 AM'}.</Label>}
          </div>
        )}
      </Card>
    </div>

    {/* Row 2: water + next up */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      <Card className="h-full">
        <CardHead title="Water" hint={<Label>Tap a glass to log it</Label>} />
        <WaterTracker personaId={p.personaId} />
      </Card>

      <Card className="h-full flex flex-col gap-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Next up</h3>
        <button type="button" onClick={() => p.onNavigate('checkups')} className="flex items-center gap-4 text-left group">
          <IconTile icon={CalendarClock} />
          <div className="flex-1 min-w-0">
            {p.checkupsLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : p.nextCheckup ? (
              <>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.nextCheckup.title}</p>
                <DueStatus checkup={p.nextCheckup} />
              </>
            ) : (
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No checkups due</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
        </button>
        <button type="button" onClick={() => p.onNavigate('scan')} className="flex items-center gap-4 text-left group">
          <IconTile icon={ScanLine} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {p.scansToday} meal{p.scansToday === 1 ? '' : 's'} scanned today
            </p>
            <Label>Scan before you eat</Label>
          </div>
          <Camera className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
        </button>
      </Card>
    </div>

    {/* Row 3: meal timeline */}
    <Card>
      <CardHead
        title="Today's meals"
        hint={
          <span className="flex items-center gap-3">
            <DemoLabel />
            <button type="button" onClick={() => p.onNavigate('plan')} className="text-sm font-medium text-teal-700 dark:text-teal-300 hover:underline">
              Full plan
            </button>
          </span>
        }
      />
      {p.meals === null ? (
        <div className="flex items-center gap-4">
          <IconTile icon={Stethoscope} />
          <p className="text-sm text-slate-500 dark:text-slate-400">Your meals are best planned with a dietitian for your condition.</p>
        </div>
      ) : (
        <MealTimeline meals={p.meals} logged={p.logged} />
      )}
    </Card>
  </div>
);
