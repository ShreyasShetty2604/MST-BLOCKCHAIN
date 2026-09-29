import React from 'react';
import { Camera, Plus, Stethoscope, FileWarning, ShieldCheck } from 'lucide-react';
import { PlannedMeal } from '../../../features/nutrition/dietPlan';
import { DerivedCheckup } from '../../../features/nutrition/recordInsights';
import { Hba1cPoint } from '../../../features/nutrition/demoProgress';
import { BentoCard, BigNumber, DemoTag } from './bento/BentoCard';
import { DailyRings, RingSpec } from './bento/DailyRings';
import { HourlyBars } from './bento/HourlyBars';
import { AwardsRow, Award } from './bento/Awards';
import { MealStrip } from './bento/MealStrip';
import { useMetricColors, useCountUp, fmt, GOALS } from './bento/metrics';
import { BmiGauge } from './charts/BmiGauge';
import { Hba1cTrend } from './charts/Hba1cTrend';
import { CheckupRing } from './charts/CheckupRing';
import { DueStatus } from './shared';
import { Skeleton } from './ui';

export type WellnessDetailId = 'rings' | 'carbs' | 'steps' | 'scan' | 'bmi' | 'hba1c' | 'checkup' | 'awards' | 'meals';

// Everything the dashboard shows for today, computed once in WellnessTab.
export interface WellnessDay {
  eatenKcal: number;
  targetKcal: number;
  burnedKcal: number;
  water: number;
  carbsHourly: number[];
  carbsTotal: number;
  carbsTarget: number;
  carbMealLimit: number | null; // per-meal limit shown as the dashed line (diabetes only)
  stepsHourly: number[];
  stepsTotal: number;
  stepsKcal: number;
  everydaySteps: number; // demo steps, without logged walks (those count through their own kcal)
  eatenMeals: Set<string>;
  nextMeal?: string;
}

const CHECKUP_SHORT: Record<string, string> = {
  hba1c: 'HbA1c',
  bp: 'BP check',
  lipid: 'Lipid profile',
  kidney: 'Kidney test',
  haemoglobin: 'Haemoglobin',
  antenatal: 'Antenatal visit',
  eye: 'Eye screening',
  foot: 'Foot exam',
  annual40: 'Annual physical'
};

export function checkupHeadline(c: DerivedCheckup): string {
  const name = CHECKUP_SHORT[c.id] ?? c.title;
  if (!/^\d{4}-/.test(c.lastDoneDate)) return `${name}: no report yet`;
  if (c.daysRemaining < 0) return `${name} overdue by ${-c.daysRemaining} day${c.daysRemaining === -1 ? '' : 's'}`;
  if (c.daysRemaining === 0) return `${name} due today`;
  return `${name} in ${c.daysRemaining} day${c.daysRemaining === 1 ? '' : 's'}`;
}

interface DashboardViewProps {
  day: WellnessDay;
  dietitianFor: string | null;
  meals: PlannedMeal[] | null;
  bmi: number;
  hba1c: Hba1cPoint[] | null; // null while records load
  nextCheckup: DerivedCheckup | undefined;
  checkupsLoading: boolean;
  awards: Award[];
  freshAwards: Set<string>;
  scansToday: number;
  onOpen: (id: WellnessDetailId) => void;
  onWater: (glasses: number) => void;
  onLogActivity: () => void;
  onToggleMeal: (type: string, eaten: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = (p) => {
  const c = useMetricColors();
  const d = p.day;
  const carbs = useCountUp(d.carbsTotal);
  const steps = useCountUp(d.stepsTotal);

  const rings: Record<'eaten' | 'burned' | 'water', RingSpec> = {
    eaten: { id: 'eaten', label: 'Eaten', value: d.eatenKcal, goal: d.targetKcal, unit: 'kcal', color: c.eaten },
    burned: { id: 'burned', label: 'Burned', value: d.burnedKcal, goal: GOALS.burnedKcal, unit: 'kcal', color: c.burned },
    water: { id: 'water', label: 'Water', value: d.water, goal: GOALS.water, unit: 'glasses', color: c.water }
  };
  const latestHba1c = p.hba1c?.length ? p.hba1c[p.hba1c.length - 1] : undefined;
  const unlocked = p.awards.filter((a) => a.progress >= 1).length;

  return (
    <div className="wv-grid">
      {/* 1. Daily rings */}
      <BentoCard title="Daily Rings" span="full" onOpen={() => p.onOpen('rings')} aside={<DemoTag />}>
        <DailyRings {...rings} onWater={p.onWater} />
        <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
          {p.dietitianFor
            ? 'Calorie goal shown is an estimate. Your dietitian will set your real target.'
            : 'Updates as you log meals, scan a meal, drink water or add activity.'}
        </p>
      </BentoCard>

      {/* 2. Carbs today */}
      <BentoCard title="Carbs today" color={c.carbs.text} span="half" onOpen={() => p.onOpen('carbs')} aside={<DemoTag />} delay={60}>
        <div className="flex items-baseline gap-2 mb-3">
          <BigNumber value={fmt(carbs)} unit="g" className="text-4xl" />
          <span className="text-xs text-slate-500 dark:text-slate-400">of {fmt(d.carbsTarget)} g target</span>
        </div>
        <div className="mt-auto">
          <HourlyBars
            values={d.carbsHourly}
            color={c.carbs.ring}
            unit="g carbs"
            limit={d.carbMealLimit ? { value: d.carbMealLimit, label: `Meal limit ${d.carbMealLimit} g` } : undefined}
          />
        </div>
      </BentoCard>

      {/* 3. Steps & activity */}
      <BentoCard title="Steps & Activity" color={c.steps.text} span="half" onOpen={() => p.onOpen('steps')} aside={<DemoTag />} delay={120}>
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <span className="flex items-baseline gap-2 min-w-0">
            <BigNumber value={fmt(steps)} className="text-4xl" />
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">steps · ≈ {fmt(d.stepsKcal)} kcal</span>
          </span>
          <button
            type="button"
            onClick={p.onLogActivity}
            className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            Log activity
          </button>
        </div>
        <div className="mt-auto">
          <HourlyBars values={d.stepsHourly} color={c.steps.ring} unit="steps" format={(n) => fmt(n)} />
        </div>
      </BentoCard>

      {/* 4. Scan my meal */}
      <BentoCard title="Scan my meal" onOpen={() => p.onOpen('scan')} delay={180}>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-2">
          <span className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-teal-400 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-teal-900/20 group-hover:scale-105 transition-transform duration-300">
            <Camera className="w-10 h-10" strokeWidth={1.8} />
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[14rem]">Photo check against your allergies and conditions.</p>
          <button
            type="button"
            onClick={() => p.onOpen('scan')}
            className="w-full max-w-[12rem] h-11 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
          >
            Scan
          </button>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {p.scansToday} scanned today
          </p>
        </div>
      </BentoCard>

      {/* 5. BMI */}
      <BentoCard title="BMI" onOpen={() => p.onOpen('bmi')} delay={240}>
        <div className="flex-1 flex flex-col justify-center">
          <BmiGauge bmi={p.bmi} compact />
        </div>
      </BentoCard>

      {/* 6. HbA1c trend */}
      <BentoCard
        title="HbA1c trend"
        span="wide"
        onOpen={() => p.onOpen('hba1c')}
        aside={p.hba1c?.some((h) => h.demo) ? <DemoTag /> : undefined}
        delay={300}
      >
        {p.hba1c === null ? (
          <Skeleton className="h-48" />
        ) : latestHba1c ? (
          <>
            <div className="flex items-baseline gap-3 mb-1">
              <BigNumber value={`${latestHba1c.value}`} unit="%" className="text-4xl" />
              {latestHba1c.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">latest</span>
            </div>
            <Hba1cTrend points={p.hba1c} compact />
          </>
        ) : (
          <div className="flex-1 flex items-center gap-4">
            <FileWarning className="w-8 h-8 text-slate-400 shrink-0" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No HbA1c reports yet. Add one on the Records page to see your trend.</p>
          </div>
        )}
      </BentoCard>

      {/* 7. Next checkup */}
      <BentoCard title="Next checkup" onOpen={() => p.onOpen('checkup')} delay={360}>
        {p.checkupsLoading ? (
          <Skeleton className="h-40" />
        ) : p.nextCheckup ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <CheckupRing checkup={p.nextCheckup} size={112} />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{checkupHeadline(p.nextCheckup)}</p>
            {/^\d{4}-/.test(p.nextCheckup.lastDoneDate) ? (
              <DueStatus checkup={p.nextCheckup} />
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Add a report on the Records page</span>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">All checkups up to date</p>
          </div>
        )}
      </BentoCard>

      {/* 8. Awards */}
      <BentoCard
        title="Awards"
        span="three"
        onOpen={() => p.onOpen('awards')}
        aside={<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{unlocked} of {p.awards.length}</span>}
        delay={420}
      >
        <div className="flex-1 flex items-center">
          <div className="w-full">
            <AwardsRow awards={p.awards} fresh={p.freshAwards} />
          </div>
        </div>
      </BentoCard>

      {/* 9. Today's meals */}
      <BentoCard title="Today's meals" span="full" onOpen={() => p.onOpen('meals')} aside={<DemoTag />} delay={480}>
        {p.meals === null ? (
          <div className="flex items-center gap-4">
            <Stethoscope className="w-8 h-8 text-slate-400 shrink-0" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Your meals are best planned with a dietitian for your condition.</p>
          </div>
        ) : (
          <MealStrip meals={p.meals} eaten={d.eatenMeals} nextMeal={d.nextMeal} onToggle={p.onToggleMeal} />
        )}
      </BentoCard>
    </div>
  );
};
