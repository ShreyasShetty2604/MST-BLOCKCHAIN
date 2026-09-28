import React, { useState } from 'react';
import {
  Pencil, RotateCcw, ShieldCheck, FilePlus2, AlertTriangle, HeartPulse, Stethoscope, Ban, Repeat, Info, ArrowRight,
  Candy, Wheat, Soup, Flame, Milk, Coffee, Wine, Egg, Banana, LucideIcon
} from 'lucide-react';
import { ChainBadge } from '../../../components/ChainBadge';
import { VerdictDot } from '../../../components/VerdictBadge';
import { ACTIVITY_LEVELS } from '../../../features/nutrition/calculator';
import { AvoidFlag, NO_AUTO_PLAN_MESSAGE, PlannedMeal } from '../../../features/nutrition/dietPlan';
import { LabInsights, STRICT_CARB_HBA1C } from '../../../features/nutrition/recordInsights';
import { classifyFood, smartSwapsFor } from '../../../features/nutrition/foodCheck';
import { DietProfileDraft } from '../../../components/ProfileEditor';
import { Card, Label, SectionTitle, IconTile, Pill, GhostButton, Disclosure, Skeleton, DemoLabel } from './ui';
import { MEAL_ICONS } from './shared';
import { MacroDonut, MacroRow } from './charts/MacroDonut';
import { MyPlate } from './charts/MyPlate';
import { GiBar } from './charts/GiBar';

interface PlanViewProps {
  profile: DietProfileDraft;
  isDemoProfile: boolean;
  age: number;
  bmi: number;
  bmiLabel: string;
  tdee: number;
  conditions: string[];
  allergies: string[];
  labs: LabInsights;
  labsLoading: boolean;
  strictCarbs: boolean;
  targetCalories: number;
  macroRows: MacroRow[];
  meals: PlannedMeal[] | null;
  dietitianFor: string | null;
  avoidFlags: AvoidFlag[];
  onEdit: () => void;
  onReset: () => void;
}

export const PlanView: React.FC<PlanViewProps> = (props) => {
  const { profile, isDemoProfile, conditions, allergies, labs, labsLoading, strictCarbs, meals, dietitianFor } = props;

  return (
    <div className="space-y-8">
      {/* Profile + macros (equal height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <Card className="h-full space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Your profile</h3>
              <Label>{isDemoProfile ? 'Demo edits · not saved to your vault' : 'Synced from your MediID vault'}</Label>
            </div>
            <div className="flex items-center -mr-2 -mt-1">
              {isDemoProfile && (
                <GhostButton icon={RotateCcw} onClick={props.onReset} aria-label="Reset to vault values">
                  <span className="hidden sm:inline">Reset</span>
                </GhostButton>
              )}
              <GhostButton icon={Pencil} onClick={props.onEdit}>
                Edit profile (demo)
              </GhostButton>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-x-4 gap-y-4">
            {[
              ['Age', `${props.age} yrs`],
              ['Weight', `${profile.weightKg} kg`],
              ['Height', `${profile.heightCm} cm`],
              ['BMI', `${props.bmi.toFixed(1)} · ${props.bmiLabel}`],
              ['Activity', ACTIVITY_LEVELS[profile.activity].label.split(' (')[0]],
              ['Diet', profile.dietType]
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt>
                  <Label>{k}</Label>
                </dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white truncate">{v}</dd>
              </div>
            ))}
          </dl>

          {(conditions.length > 0 || allergies.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              {conditions.map((c) => (
                <Pill key={c}>{c}</Pill>
              ))}
              {allergies.map((a) => (
                <Pill key={a}>
                  <AlertTriangle className="w-3 h-3" /> {a}
                </Pill>
              ))}
            </div>
          )}
        </Card>

        {dietitianFor ? (
          <Card className="h-full flex flex-col justify-center gap-4">
            <IconTile icon={Stethoscope} />
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{NO_AUTO_PLAN_MESSAGE}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dietitianFor} needs individually supervised calories, protein and minerals, so no calorie target, macros or meal plan are shown.
              </p>
            </div>
          </Card>
        ) : (
          <MacroCard {...props} />
        )}
      </div>

      {!dietitianFor && (
        <>
          <WhyThisPlan labs={labs} loading={labsLoading} strictCarbs={strictCarbs} />

          <section className="space-y-4">
            <SectionTitle title="Meal plan" subtitle={`A 1-day Indian plan · ${profile.dietType.toLowerCase()}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {(meals ?? []).map((meal) => (
                <MealCard key={meal.type} meal={meal} conditions={conditions} allergies={allergies} />
              ))}
            </div>
          </section>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <Card className="h-full space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">My Plate</h3>
            <Label>How to fill each meal (ICMR guidance)</Label>
          </div>
          <MyPlate dietType={profile.dietType} />
        </Card>
        <FoodsToLimit flags={props.avoidFlags} />
      </div>
    </div>
  );
};

const MacroCard: React.FC<PlanViewProps> = ({ macroRows, targetCalories, strictCarbs, labsLoading }) => (
  <Card className="h-full flex flex-col gap-5">
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Macros · today vs target</h3>
        <Label>
          Outer ring: target split of {targetCalories.toLocaleString()} kcal{strictCarbs ? ' (stricter carbs)' : ''}
        </Label>
      </div>
      <DemoLabel />
    </div>
    {labsLoading ? (
      <Skeleton className="h-44 w-full rounded-2xl" />
    ) : (
      <div className="flex-1 flex items-center">
        <MacroDonut rows={macroRows} targetLabel="Target" />
      </div>
    )}
  </Card>
);

const WhyThisPlan: React.FC<{ labs: LabInsights; loading: boolean; strictCarbs: boolean }> = ({ labs, loading, strictCarbs }) => {
  if (loading) return <Skeleton className="h-20 w-full rounded-2xl" />;

  return (
    <div className="space-y-3">
      {labs.tamperedHba1c && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-sm text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Your newest HbA1c report ({labs.tamperedHba1c.date}) failed its on-chain integrity check, so it wasn't used.</span>
        </div>
      )}

      {labs.hba1c ? (
        <Card>
          <Disclosure
            summary={
              <span className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>
                  {strictCarbs ? 'Plan adjusted using' : 'Plan based on'} your {labs.hba1c.verified ? 'hospital-verified' : 'self-declared'} HbA1c
                  report ({labs.hba1c.value}%)
                  {labs.hba1c.verified && <span className="text-teal-700 dark:text-teal-300"> · Verified on-chain</span>}
                </span>
              </span>
            }
          >
            <div className="pl-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                {strictCarbs
                  ? `Your HbA1c is ${STRICT_CARB_HBA1C}% or higher, so carbs are lowered to 40% of calories and protein raised to 30%.`
                  : `Your HbA1c is below ${STRICT_CARB_HBA1C}%, so the standard split (45% carbs) applies.`}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Source: {labs.hba1c.record.title} · {labs.hba1c.record.date}
              </p>
              {!labs.hba1c.verified && <p>This report isn't hospital-verified yet — ask your hospital to anchor it.</p>}
              {labs.bp && (
                <p className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-teal-600" /> Latest BP {labs.bp.value.systolic}/{labs.bp.value.diastolic} mmHg ({labs.bp.record.date})
                </p>
              )}
              {labs.hba1c.verified && <ChainBadge tone="teal" txHash={labs.hba1c.record.txHash} label="View on-chain proof" />}
            </div>
          </Disclosure>
        </Card>
      ) : (
        <Card className="flex items-center gap-4">
          <IconTile icon={FilePlus2} />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Add an HbA1c report for a more personalised plan</p>
            <Label>Add it on the Records page — a hospital-verified report lets us tune your carbs.</Label>
          </div>
        </Card>
      )}
    </div>
  );
};

const MealCard: React.FC<{ meal: PlannedMeal; conditions: string[]; allergies: string[] }> = ({ meal, conditions, allergies }) => {
  // Only suggest swaps whose replacement is not an allergen for this patient.
  const hasSwapList = smartSwapsFor(meal.type).length > 0;
  const swaps = smartSwapsFor(meal.type)
    .map((sw) => ({ ...sw, fromV: classifyFood(sw.from, { conditions, allergies }), toV: classifyFood(sw.to, { conditions, allergies }) }))
    .filter((sw) => sw.toV.verdict !== 'avoid');
  const Icon = MEAL_ICONS[meal.type];

  return (
    <Card interactive className="h-full flex flex-col gap-4">
      <div className="flex items-start gap-4">
        {Icon && <IconTile icon={Icon} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{meal.type}</p>
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300 whitespace-nowrap">{meal.calories} kcal</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Label>{meal.time}</Label>
            <GiBar gi={meal.gi} />
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{meal.items}</p>

      {meal.allergyWarning && (
        <p className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {meal.allergyWarning}
        </p>
      )}

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <Disclosure
          summary={
            <span className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-slate-400" /> Why this meal
            </span>
          }
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">{meal.why}</p>
        </Disclosure>
        <Disclosure
          summary={
            <span className="flex items-center gap-2 text-sm">
              <Repeat className="w-4 h-4 text-slate-400" /> Smart swaps
            </span>
          }
        >
          {swaps.length === 0 ? (
            <p className="text-sm text-slate-500">
              {hasSwapList ? 'No swaps here that avoid your allergens.' : 'Nothing to swap — this is already a light, low-GI choice.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {swaps.map((sw) => (
                <li key={sw.from.name}>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                    <VerdictDot verdict={sw.fromV.verdict} title={sw.fromV.reason} />
                    {sw.from.name}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <VerdictDot verdict={sw.toV.verdict} title={sw.toV.reason} />
                    <span className="font-semibold">{sw.to.name}</span>
                  </p>
                  <Label>{sw.why}</Label>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
      </div>
    </Card>
  );
};

const FLAG_ICONS: [RegExp, LucideIcon][] = [
  [/sugar|sweet/i, Candy],
  [/maida|bread/i, Wheat],
  [/pickle|papad|namkeen|salty/i, Soup],
  [/fried/i, Flame],
  [/ghee|cream|dairy/i, Milk],
  [/tea|coffee/i, Coffee],
  [/papaya|alcohol/i, Wine],
  [/egg/i, Egg],
  [/potassium/i, Banana]
];
const flagIcon = (flag: AvoidFlag): LucideIcon =>
  flag.source === 'allergy' ? AlertTriangle : FLAG_ICONS.find(([re]) => re.test(flag.label))?.[1] ?? Ban;

const FoodsToLimit: React.FC<{ flags: AvoidFlag[] }> = ({ flags }) => {
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? active;

  return (
    <section className="h-full">
      <Card className="h-full space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Foods to limit</h3>
          <Label>From your conditions and allergies — tap one to see why</Label>
        </div>
        {flags.length === 0 ? (
          <p className="text-sm text-slate-500">No diet restrictions found in your profile.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, idx) => {
                const Icon = flagIcon(flag);
                return (
                  <button
                    key={flag.label}
                    type="button"
                    onClick={() => setActive(active === idx ? null : idx)}
                    onMouseEnter={() => setHover(idx)}
                    onMouseLeave={() => setHover(null)}
                    aria-expanded={shown === idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      shown === idx
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {flag.label}
                  </button>
                );
              })}
            </div>
            {shown !== null && (
              <p role="status" className="text-sm text-slate-600 dark:text-slate-300 animate-fade-in">
                {flags[shown].rule}
              </p>
            )}
          </>
        )}
      </Card>
    </section>
  );
};
