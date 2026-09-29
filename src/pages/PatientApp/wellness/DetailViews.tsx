import React from 'react';
import { ChevronLeft, Plus, Trash2, Pencil, ScanLine, Footprints, Bike, PersonStanding, LucideIcon } from 'lucide-react';
import { PlannedMeal } from '../../../features/nutrition/dietPlan';
import { minutesOf } from '../../../features/nutrition/demoProgress';
import { ACTIVITY_LEVELS } from '../../../features/nutrition/calculator';
import { DietProfileDraft } from '../../../components/ProfileEditor';
import { Card, Label, DemoLabel } from './ui';
import { MEAL_ICONS } from './shared';
import { WellnessDay } from './DashboardView';
import { DailyRings, RingSpec } from './bento/DailyRings';
import { HourlyBars } from './bento/HourlyBars';
import { Badge, Award } from './bento/Awards';
import { ActivityEntry, ScanEntry } from './bento/useDayLog';
import { useMetricColors, fmt, GOALS, ACTIVITY_MET, ActivityKind } from './bento/metrics';
import { MacroDonut, MacroRow } from './charts/MacroDonut';
import { WaterTracker } from './charts/WaterTracker';
import { BmiGauge } from './charts/BmiGauge';
import { WeightSparkline } from './charts/WeightSparkline';

const ACTIVITY_ICONS: Record<ActivityKind, LucideIcon> = { walk: Footprints, yoga: PersonStanding, cycling: Bike };

const clock = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(minutes % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// Shell for an expanded card: back link, big title, then the detailed content.
export const DetailShell: React.FC<{ title: string; color?: string; subtitle?: string; onBack: () => void; children: React.ReactNode }> = ({
  title,
  color,
  subtitle,
  onBack,
  children
}) => (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-2">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-sm font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-400/10 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Wellness
      </button>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color }}>
        <span className={color ? '' : 'text-slate-900 dark:text-white'}>{title}</span>
      </h1>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Row: React.FC<{ icon?: LucideIcon; title: string; meta?: string; value: string; action?: React.ReactNode }> = ({ icon: Icon, title, meta, value, action }) => (
  <li className="flex items-center gap-3 py-2.5">
    {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{title}</span>
      {meta && <span className="block text-xs text-slate-500 dark:text-slate-400">{meta}</span>}
    </span>
    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
    {action}
  </li>
);

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="py-2 text-sm text-slate-500 dark:text-slate-400">{children}</p>;

const LogButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors">
    <Plus className="w-4 h-4" strokeWidth={3} />
    Log activity
  </button>
);

const ActivityList: React.FC<{ activities: ActivityEntry[]; onRemove: (id: string) => void }> = ({ activities, onRemove }) =>
  activities.length ? (
    <ul className="divide-y divide-slate-100 dark:divide-white/5">
      {activities.map((a) => (
        <Row
          key={a.id}
          icon={ACTIVITY_ICONS[a.kind]}
          title={`${ACTIVITY_MET[a.kind].label} · ${a.minutes} min`}
          meta={`${clock(a.at)} · MET ${ACTIVITY_MET[a.kind].met}`}
          value={`${a.kcal} kcal`}
          action={
            <button type="button" onClick={() => onRemove(a.id)} aria-label="Remove activity" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-400/10">
              <Trash2 className="w-4 h-4" />
            </button>
          }
        />
      ))}
    </ul>
  ) : (
    <Empty>No activity logged yet today.</Empty>
  );

// ---------------------------------------------------------------------------

interface RingsDetailProps {
  rings: { eaten: RingSpec; burned: RingSpec; water: RingSpec };
  day: WellnessDay;
  meals: PlannedMeal[];
  scans: ScanEntry[];
  activities: ActivityEntry[];
  onWater: (n: number) => void;
  onLogActivity: () => void;
  onRemoveActivity: (id: string) => void;
  onBack: () => void;
}

export const RingsDetail: React.FC<RingsDetailProps> = (p) => {
  const c = useMetricColors();
  const eatenMeals = p.meals.filter((m) => p.day.eatenMeals.has(m.type));
  return (
    <DetailShell title="Daily Rings" subtitle="Eaten, burned and water for today." onBack={p.onBack}>
      <Card className="rounded-[20px]">
        <div className="flex justify-end -mt-2 mb-2">
          <DemoLabel />
        </div>
        <DailyRings {...p.rings} onWater={p.onWater} size={240} />
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <Card className="rounded-[20px] space-y-2">
          <h2 className="text-base font-semibold" style={{ color: c.eaten.text }}>
            Eaten · {fmt(p.day.eatenKcal)} kcal
          </h2>
          {eatenMeals.length || p.scans.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {eatenMeals.map((m) => (
                <Row key={m.type} icon={MEAL_ICONS[m.type]} title={m.type} meta={m.time} value={`${m.calories} kcal`} />
              ))}
              {p.scans.map((s, i) => (
                <Row key={`scan-${i}`} icon={ScanLine} title="Scanned meal" meta={`${clock(s.at)} · AI estimate`} value={`${s.kcal} kcal`} />
              ))}
            </ul>
          ) : (
            <Empty>Nothing eaten yet. Tick a meal or scan one.</Empty>
          )}
        </Card>
        <Card className="rounded-[20px] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold" style={{ color: c.burned.text }}>
              Burned · {fmt(p.day.burnedKcal)} kcal
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            <Row icon={Footprints} title={`${fmt(p.day.everydaySteps)} steps`} meta="Everyday walking (demo)" value={`${fmt(p.day.stepsKcal)} kcal`} />
          </ul>
          <ActivityList activities={p.activities} onRemove={p.onRemoveActivity} />
          <div className="pt-2">
            <LogButton onClick={p.onLogActivity} />
          </div>
        </Card>
        <Card className="rounded-[20px] space-y-4">
          <h2 className="text-base font-semibold" style={{ color: c.water.text }}>
            Water
          </h2>
          <WaterTracker count={p.day.water} goal={GOALS.water} color={c.water.ring} onChange={p.onWater} />
        </Card>
      </div>
    </DetailShell>
  );
};

// ---------------------------------------------------------------------------

interface CarbsDetailProps {
  day: WellnessDay;
  meals: PlannedMeal[];
  mealCarbs: (m: PlannedMeal) => number;
  scans: ScanEntry[];
  macroRows: MacroRow[];
  strictCarbs: boolean;
  onBack: () => void;
}

export const CarbsDetail: React.FC<CarbsDetailProps> = (p) => {
  const c = useMetricColors();
  const sources = [
    ...p.meals.filter((m) => p.day.eatenMeals.has(m.type)).map((m) => ({ key: m.type, at: minutesOf(m.time), icon: MEAL_ICONS[m.type], title: m.type, grams: p.mealCarbs(m) })),
    ...p.scans.map((s, i) => ({ key: `scan-${i}`, at: s.at, icon: ScanLine, title: 'Scanned meal', grams: s.carbsG }))
  ].sort((a, b) => a.at - b.at);
  return (
    <DetailShell
      title="Carbs today"
      color={c.carbs.text}
      subtitle={`${fmt(p.day.carbsTotal)} g of your ${fmt(p.day.carbsTarget)} g daily target${p.strictCarbs ? ' (stricter carbs from your HbA1c report)' : ''}.`}
      onBack={p.onBack}
    >
      <Card className="rounded-[20px] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>By hour</Label>
          <DemoLabel />
        </div>
        <HourlyBars
          values={p.day.carbsHourly}
          color={c.carbs.ring}
          unit="g carbs"
          height={200}
          limit={p.day.carbMealLimit ? { value: p.day.carbMealLimit, label: `Meal limit ${p.day.carbMealLimit} g` } : undefined}
        />
        {p.day.carbMealLimit && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dashed line: a {p.day.carbMealLimit} g carb limit per meal for diabetes. Amber bars went over it.
          </p>
        )}
      </Card>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <Card className="rounded-[20px] space-y-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Where they came from</h2>
          {sources.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {sources.map((s) => (
                <Row key={s.key} icon={s.icon} title={s.title} meta={clock(s.at)} value={`${s.grams} g`} />
              ))}
            </ul>
          ) : (
            <Empty>No carbs logged yet today.</Empty>
          )}
        </Card>
        <Card className="rounded-[20px] space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Macros today vs target</h2>
          <MacroDonut rows={p.macroRows} targetLabel="Target" />
        </Card>
      </div>
    </DetailShell>
  );
};

// ---------------------------------------------------------------------------

interface StepsDetailProps {
  day: WellnessDay;
  activities: ActivityEntry[];
  onLogActivity: () => void;
  onRemoveActivity: (id: string) => void;
  onBack: () => void;
}

export const StepsDetail: React.FC<StepsDetailProps> = (p) => {
  const c = useMetricColors();
  const activityKcal = p.activities.reduce((s, a) => s + a.kcal, 0);
  return (
    <DetailShell
      title="Steps & Activity"
      color={c.steps.text}
      subtitle={`${fmt(p.day.stepsTotal)} of ${fmt(GOALS.steps)} steps · ${fmt(p.day.burnedKcal)} kcal burned today.`}
      onBack={p.onBack}
    >
      <Card className="rounded-[20px] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Label>Steps by hour</Label>
          <DemoLabel />
        </div>
        <HourlyBars values={p.day.stepsHourly} color={c.steps.ring} unit="steps" height={200} format={(n) => fmt(n)} />
      </Card>
      <Card className="rounded-[20px] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Activities</h2>
            <Label>{activityKcal} kcal from logged activity · kcal = MET × weight × hours</Label>
          </div>
          <LogButton onClick={p.onLogActivity} />
        </div>
        <ActivityList activities={p.activities} onRemove={p.onRemoveActivity} />
      </Card>
    </DetailShell>
  );
};

// ---------------------------------------------------------------------------

interface BmiDetailProps {
  bmi: number;
  bmiLabel: string;
  profile: DietProfileDraft;
  isDemoProfile: boolean;
  weight: { points: { week: string; value: number }[]; targetKg: number };
  onEdit: () => void;
  onBack: () => void;
}

export const BmiDetail: React.FC<BmiDetailProps> = (p) => (
  <DetailShell title="BMI" subtitle={`${p.bmi.toFixed(1)} · ${p.bmiLabel} (Asian cut-offs)`} onBack={p.onBack}>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
      <Card className="rounded-[20px]">
        <BmiGauge bmi={p.bmi} />
      </Card>
      <Card className="rounded-[20px] space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Body</h2>
            <Label>{p.isDemoProfile ? 'Demo edits · not saved to your vault' : 'Synced from your MediID vault'}</Label>
          </div>
          <button type="button" onClick={p.onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-400/10">
            <Pencil className="w-4 h-4" />
            Edit profile (demo)
          </button>
        </div>
        <dl className="grid grid-cols-3 gap-4">
          {[
            ['Weight', `${p.profile.weightKg} kg`],
            ['Height', `${p.profile.heightCm} cm`],
            ['Activity', ACTIVITY_LEVELS[p.profile.activity].label.split(' (')[0]]
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Weight, last 12 weeks</Label>
            <DemoLabel />
          </div>
          <WeightSparkline points={p.weight.points} targetKg={p.weight.targetKg} />
        </div>
      </Card>
    </div>
  </DetailShell>
);

// ---------------------------------------------------------------------------

export const AwardsDetail: React.FC<{ awards: Award[]; fresh: Set<string>; onBack: () => void }> = ({ awards, fresh, onBack }) => (
  <DetailShell title="Awards" subtitle={`${awards.filter((a) => a.progress >= 1).length} of ${awards.length} unlocked. Streaks use demo data.`} onBack={onBack}>
    <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {awards.map((a, i) => {
        const done = a.progress >= 1;
        return (
          <li key={a.id}>
            <Card className="rounded-[20px] h-full flex items-center gap-5">
              <Badge award={a} size={84} justUnlocked={fresh.has(a.id)} delay={i * 80} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-base font-semibold text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{a.how}</p>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(a.progress * 100)}%`, background: a.colors[1] }} />
                </div>
                <p className={`text-xs font-semibold ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {done ? `Unlocked · ${a.status}` : a.status}
                </p>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  </DetailShell>
);
