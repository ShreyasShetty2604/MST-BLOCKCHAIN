import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PatientPersona, MedicalRecord } from '../../mock/types';
import { ProfileEditor, DietProfileDraft } from '../../components/ProfileEditor';
import { mockApi } from '../../mock/api';
import {
  calculateBmi, classifyBmiAsian, calculateBmr, calculateTdee, calculateCalorieTarget,
  ActivityLevel, BmiCategory, Sex
} from '../../features/nutrition/calculator';
import { buildMealPlan, deriveAvoidFlags, isFoodAllergy, needsDietitian, PlannedMeal } from '../../features/nutrition/dietPlan';
import { readLabInsights, deriveCheckups, STRICT_CARB_HBA1C } from '../../features/nutrition/recordInsights';
import { MealAnalysis, Verdict, evaluateMeal } from '../../features/nutrition/mealScan';
import { demoHistory, withLiveToday, flagOf } from '../../features/nutrition/weeklyHistory';
import {
  todayLog, todayMacroIntake, hba1cTrend, weightTrend, weeklyAdherence, demoHourlySteps, lowSugarStreak, minutesOf
} from '../../features/nutrition/demoProgress';
import { ScanView } from './wellness/ScanView';
import { PlanView } from './wellness/PlanView';
import { CheckupsView } from './wellness/CheckupsView';
import { ProgressView } from './wellness/ProgressView';
import { DashboardView, WellnessDay, WellnessDetailId } from './wellness/DashboardView';
import { WeeklyProgress } from './wellness/weekly/WeeklyProgress';
import { DetailShell, RingsDetail, CarbsDetail, StepsDetail, BmiDetail, AwardsDetail } from './wellness/DetailViews';
import { BentoStyles } from './wellness/bento/BentoCard';
import { RingSpec } from './wellness/bento/DailyRings';
import { LogActivityModal } from './wellness/bento/LogActivityModal';
import { buildAwards, useNewUnlocks, Award } from './wellness/bento/Awards';
import { useDayLog } from './wellness/bento/useDayLog';
import { useMetricColors, stepKcal, GOALS, STEPS_PER_WALK_MINUTE } from './wellness/bento/metrics';

interface WellnessTabProps {
  persona: PatientPersona;
  onShowToast: (msg: string) => void;
}

// Physiological values prefilled from the vault (not yet stored on the persona).
const VAULT_BODY = { weightKg: 74, heightCm: 172, activity: 'moderate' as ActivityLevel, dietType: 'Vegetarian' as const };

// Macros: kcal per gram, and share of the daily target. A high HbA1c switches to stricter carbs.
// (Colours come from the chart theme so light and dark each use validated steps.)
const MACROS = [
  { name: 'Carbs' as const, kcalPerGram: 4 },
  { name: 'Protein' as const, kcalPerGram: 4 },
  { name: 'Fat' as const, kcalPerGram: 9 }
];
const MACRO_SPLIT = {
  standard: { Carbs: 0.45, Protein: 0.25, Fat: 0.3 },
  strictCarbs: { Carbs: 0.4, Protein: 0.3, Fat: 0.3 }
};

// Weight-goal adjustment applied to maintenance calories, by BMI band.
const BMI_ADJUSTMENT: Record<BmiCategory, number> = { underweight: 300, normal: 0, overweight: -500, obese: -500 };

// Per-meal carb limit for diabetes (carb counting: 45–60 g a meal; the stricter end when HbA1c is high).
const MEAL_CARB_LIMIT = { standard: 60, strict: 45 };

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

const hourOf = (minutes: number) => Math.floor(minutes / 60) % 24;

export const WellnessTab: React.FC<WellnessTabProps> = ({ persona, onShowToast }) => {
  const [detail, setDetail] = useState<WellnessDetailId | null>(null);
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [draft, setDraft] = useState<DietProfileDraft | null>(null); // demo edits; null = vault values
  const [editorOpen, setEditorOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    // Same records the Records page shows; they drive the plan adjustments and the checkups.
    let cancelled = false;
    setRecords(null);
    mockApi.getRecords('All', persona.id).then((r) => !cancelled && setRecords(r));
    setDraft(null);
    setDetail(null);
    return () => {
      cancelled = true;
    };
  }, [persona.id]);

  // Effective profile = vault values, or the demo edits. Everything below reads from it.
  const vaultProfile: DietProfileDraft = useMemo(
    () => ({
      ...VAULT_BODY,
      conditions: persona.emergencyInfo.conditions,
      foodAllergies: persona.emergencyInfo.allergies.filter(isFoodAllergy)
    }),
    [persona]
  );
  const profile = draft ?? vaultProfile;
  const conditions = profile.conditions;
  // Medicine/environmental allergies aren't editable here but still apply to meal scans.
  const allergies = useMemo(
    () => [...profile.foodAllergies, ...persona.emergencyInfo.allergies.filter((a) => !isFoodAllergy(a))],
    [profile.foodAllergies, persona.emergencyInfo.allergies]
  );
  const effectivePersona: PatientPersona = useMemo(
    () => ({ ...persona, emergencyInfo: { ...persona.emergencyInfo, conditions, allergies } }),
    [persona, conditions, allergies]
  );
  const dietitianFor = needsDietitian(conditions);
  const age = ageFromDob(persona.dob);
  const sex: Sex = persona.gender.toLowerCase().startsWith('f') ? 'female' : 'male';

  // All numbers come from the nutrition calculator.
  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const bmiBand = classifyBmiAsian(bmi);
  const tdee = calculateTdee(calculateBmr(sex, profile.weightKg, profile.heightCm, age), profile.activity);
  const targetCalories = calculateCalorieTarget(tdee, BMI_ADJUSTMENT[bmiBand.category], sex);

  const labs = useMemo(() => readLabInsights(records ?? []), [records]);
  const strictCarbs = labs.hba1c !== null && labs.hba1c.value >= STRICT_CARB_HBA1C;
  const split = strictCarbs ? MACRO_SPLIT.strictCarbs : MACRO_SPLIT.standard;
  const macros = MACROS.map((m) => {
    const share = split[m.name as keyof typeof split];
    return { ...m, grams: Math.round((targetCalories * share) / m.kcalPerGram), percent: Math.round(share * 100) };
  });

  const meals = useMemo(
    () => buildMealPlan(targetCalories, conditions, profile.dietType, allergies),
    [targetCalories, conditions, profile.dietType, allergies]
  );
  const avoidFlags = useMemo(() => deriveAvoidFlags(conditions, allergies), [conditions, allergies]);
  const isDiabetic = conditions.some((c) => /diabet|glyc|insulin/i.test(c));

  // ---- Today's live log: meal ticks, scans, water and activities drive the rings, carbs and steps.
  const dayLog = useDayLog(persona.id, profile.weightKg);
  const colors = useMetricColors();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const clockLog = useMemo(() => todayLog(meals ?? []), [meals]); // untouched meals count once their time has passed
  const eatenMeals = useMemo(
    () => new Set((meals ?? []).filter((m) => dayLog.mealTicks[m.type] ?? clockLog.logged.has(m.type)).map((m) => m.type)),
    [meals, dayLog.mealTicks, clockLog.logged]
  );
  const eatenPlanned = (meals ?? []).filter((m) => eatenMeals.has(m.type));
  const mealKcal = eatenPlanned.reduce((sum, m) => sum + m.calories, 0);
  const scanTotals = dayLog.scans.reduce(
    (t, s) => ({ kcal: t.kcal + s.kcal, Carbs: t.Carbs + s.carbsG, Protein: t.Protein + s.proteinG, Fat: t.Fat + s.fatG }),
    { kcal: 0, Carbs: 0, Protein: 0, Fat: 0 }
  );

  // Macro intake: planned meals follow the patient's (demo) typical split; scans add their own estimate.
  const mealIntake = useMemo(() => todayMacroIntake(mealKcal, split, persona.id), [mealKcal, split, persona.id]);
  const carbShare = useMemo(() => todayMacroIntake(1000, split, persona.id)[0].percent / 100, [split, persona.id]);
  const mealCarbs = useCallback((m: PlannedMeal) => Math.round((m.calories * carbShare) / 4), [carbShare]);
  const intakeGrams = mealIntake.map((i) => ({ name: i.name, grams: i.grams + Math.round(scanTotals[i.name]) }));
  const intakeKcal = intakeGrams.reduce((s, i) => s + i.grams * (i.name === 'Fat' ? 9 : 4), 0) || 1;
  const macroRows = macros.map((m) => {
    const grams = intakeGrams.find((i) => i.name === m.name)!.grams;
    return { name: m.name, grams, percent: Math.round(((grams * m.kcalPerGram) / intakeKcal) * 100), targetPercent: m.percent };
  });

  const carbsHourly = Array<number>(24).fill(0);
  eatenPlanned.forEach((m) => (carbsHourly[hourOf(minutesOf(m.time))] += mealCarbs(m)));
  dayLog.scans.forEach((s) => (carbsHourly[hourOf(s.at)] += s.carbsG));

  const demoSteps = useMemo(() => demoHourlySteps(persona.id), [persona.id]);
  const stepsHourly = demoSteps.slice();
  dayLog.activities.filter((a) => a.kind === 'walk').forEach((a) => (stepsHourly[hourOf(a.at)] += a.minutes * STEPS_PER_WALK_MINUTE));
  // Everyday steps burn by step count; logged walks count once, through their MET calories.
  const everydaySteps = demoSteps.reduce((s, n) => s + n, 0);
  const stepsKcal = stepKcal(everydaySteps, profile.weightKg);
  const activityMinutes = dayLog.activities.reduce((s, a) => s + a.minutes, 0);

  const day: WellnessDay = {
    eatenKcal: mealKcal + scanTotals.kcal,
    targetKcal: targetCalories,
    burnedKcal: stepsKcal + dayLog.activities.reduce((s, a) => s + a.kcal, 0),
    water: dayLog.water,
    carbsHourly,
    carbsTotal: Math.round(carbsHourly.reduce((s, n) => s + n, 0)),
    carbsTarget: macros[0].grams,
    carbMealLimit: isDiabetic ? (strictCarbs ? MEAL_CARB_LIMIT.strict : MEAL_CARB_LIMIT.standard) : null,
    stepsHourly,
    stepsTotal: stepsHourly.reduce((s, n) => s + n, 0),
    stepsKcal,
    everydaySteps,
    eatenMeals,
    nextMeal: (meals ?? []).find((m) => minutesOf(m.time) > nowMin && !eatenMeals.has(m.type))?.type
  };
  const rings: Record<'eaten' | 'burned' | 'water', RingSpec> = {
    eaten: { id: 'eaten', label: 'Eaten', value: day.eatenKcal, goal: day.targetKcal, unit: 'kcal', color: colors.eaten },
    burned: { id: 'burned', label: 'Burned', value: day.burnedKcal, goal: GOALS.burnedKcal, unit: 'kcal', color: colors.burned },
    water: { id: 'water', label: 'Water', value: day.water, goal: GOALS.water, unit: 'glasses', color: colors.water }
  };

  // ---- Trends (demo, anchored to real records where they exist).
  const hba1c = useMemo(() => (records === null ? null : hba1cTrend(records, persona.id, isDiabetic)), [records, persona.id, isDiabetic]);
  const weight = useMemo(() => weightTrend(profile.weightKg, profile.heightCm, persona.id), [profile.weightKg, profile.heightCm, persona.id]);
  const adherence = useMemo(() => weeklyAdherence(meals ?? [], persona.id), [meals, persona.id]);
  const dailyReference = {
    carbsG: macros[0].grams,
    proteinG: macros[1].grams,
    fatG: macros[2].grams,
    sugarG: 25, // WHO free-sugar guidance (~5% of energy)
    sodiumMg: 2000 // WHO sodium limit
  };

  const checkups = useMemo(() => (records === null ? null : deriveCheckups(records, conditions)), [records, conditions]);
  const nextCheckup = (checkups ?? []).filter((r) => r.dueState !== 'done').sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  const checkupOnTime = (checkups ?? []).some((c) => c.dueState === 'done');

  const awards = useMemo(
    () =>
      buildAwards({
        lowSugarStreak: lowSugarStreak(persona.id),
        water: dayLog.water,
        waterGoal: GOALS.water,
        scans: dayLog.scans.length,
        activityMinutes,
        checkupOnTime,
        checkupStatus: checkups === null ? 'Loading…' : checkupOnTime ? 'Latest checkup on time' : 'Book your next checkup'
      }),
    [persona.id, dayLog.water, dayLog.scans.length, activityMinutes, checkupOnTime, checkups]
  );
  const onUnlock = useCallback((a: Award) => onShowToast(`Award unlocked: ${a.title}`), [onShowToast]);
  const freshAwards = useNewUnlocks(awards, onUnlock);

  // ---- Weekly Progress: 9 weeks of seeded history, with today swapped for the live log.
  const history = useMemo(
    () => demoHistory({ personaId: persona.id, targetKcal: targetCalories, carbLimitG: macros[0].grams, weightKg: profile.weightKg, isDiabetic }),
    [persona.id, targetCalories, macros[0].grams, profile.weightKg, isDiabetic] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const liveHistory = withLiveToday(
    history,
    {
      eatenKcal: day.eatenKcal,
      burnedKcal: day.burnedKcal,
      water: day.water,
      carbsG: day.carbsTotal,
      steps: day.stepsTotal,
      eatenMeals,
      scans: dayLog.scans.filter((s) => s.verdict).map((s) => ({ verdict: s.verdict!, flag: s.flag }))
    },
    profile.weightKg
  );

  const handleScanComplete = (analysis: MealAnalysis, verdict: Verdict) => {
    // What got it flagged (for "Most flagged" in Weekly Progress): allergy first, else the food type.
    let flag: string | undefined;
    if (verdict !== 'clear') {
      const flagged = evaluateMeal(analysis, { allergies, conditions }).dishes.filter((d) => d.verdict !== 'clear');
      const pool = flagged.length ? flagged.map((d) => ({ dish: d.dish, reason: d.reason })) : analysis.dishes.map((dish) => ({ dish, reason: '' }));
      flag = pool.some((d) => /allerg/i.test(d.reason))
        ? 'allergens'
        : flagOf(pool.map((d) => [d.dish.name, ...d.dish.visibleIngredients, ...d.dish.hiddenIngredients, d.reason].join(' ')).join(' '));
    }
    // A scan without a nutrition estimate still counts as a scan; it just adds no calories.
    const n = analysis.nutrition;
    dayLog.addScan({ carbsG: n?.carbsG ?? 0, proteinG: n?.proteinG ?? 0, fatG: n?.fatG ?? 0, verdict, flag });
  };

  const go = (id: WellnessDetailId | null) => {
    setDetail(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => go(null);
  const openActivity = () => setActivityOpen(true);

  const today = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="wv-bento space-y-6 animate-fade-in">
      <BentoStyles />

      {detail === null ? (
        <>
          <header>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Wellness</h1>
            <p className="mt-1 text-base font-medium text-slate-500 dark:text-slate-400">{today}</p>
          </header>
          <DashboardView
            day={day}
            dietitianFor={dietitianFor}
            meals={meals}
            bmi={bmi}
            hba1c={hba1c}
            nextCheckup={nextCheckup}
            checkupsLoading={checkups === null}
            awards={awards}
            freshAwards={freshAwards}
            scansToday={dayLog.scans.length}
            onOpen={go}
            onWater={dayLog.setWater}
            onLogActivity={openActivity}
            onToggleMeal={dayLog.setMealEaten}
          />
          <WeeklyProgress history={liveHistory} targetKcal={targetCalories} carbLimitG={macros[0].grams} isDiabetic={isDiabetic} targetKg={weight.targetKg} />
        </>
      ) : (
        <div key={detail}>
          {detail === 'rings' && (
            <RingsDetail
              rings={rings}
              day={day}
              meals={meals ?? []}
              scans={dayLog.scans}
              activities={dayLog.activities}
              onWater={dayLog.setWater}
              onLogActivity={openActivity}
              onRemoveActivity={dayLog.removeActivity}
              onBack={back}
            />
          )}
          {detail === 'carbs' && (
            <CarbsDetail day={day} meals={meals ?? []} mealCarbs={mealCarbs} scans={dayLog.scans} macroRows={macroRows} strictCarbs={strictCarbs} onBack={back} />
          )}
          {detail === 'steps' && (
            <StepsDetail day={day} activities={dayLog.activities} onLogActivity={openActivity} onRemoveActivity={dayLog.removeActivity} onBack={back} />
          )}
          {detail === 'scan' && (
            <DetailShell title="Scan my meal" subtitle="Take or upload a photo. We check it against your allergies and conditions." onBack={back}>
              <ScanView persona={effectivePersona} onScanComplete={handleScanComplete} dailyReference={dailyReference} />
            </DetailShell>
          )}
          {detail === 'bmi' && (
            <BmiDetail
              bmi={bmi}
              bmiLabel={bmiBand.label}
              profile={profile}
              isDemoProfile={draft !== null}
              weight={weight}
              onEdit={() => setEditorOpen(true)}
              onBack={back}
            />
          )}
          {detail === 'hba1c' && (
            <DetailShell title="HbA1c & progress" subtitle="Hospital-verified reports, weight, and how closely you followed the plan." onBack={back}>
              <ProgressView hba1c={hba1c} weight={weight} adherence={adherence} mealTypes={(meals ?? []).map((m) => m.type)} />
            </DetailShell>
          )}
          {detail === 'checkup' && (
            <DetailShell title="Checkups" subtitle="Scheduled from the dates of your reports on the Records page." onBack={back}>
              <CheckupsView checkups={checkups} records={records} onTestReminder={() => onShowToast('Push notification test sent to registered mobile device!')} />
            </DetailShell>
          )}
          {detail === 'awards' && <AwardsDetail awards={awards} fresh={freshAwards} onBack={back} />}
          {detail === 'meals' && (
            <DetailShell title="Diet plan" subtitle="Today's meals, the reasons behind them, and smart swaps." onBack={back}>
              <PlanView
                profile={profile}
                isDemoProfile={draft !== null}
                age={age}
                bmi={bmi}
                bmiLabel={bmiBand.label}
                tdee={tdee}
                conditions={conditions}
                allergies={allergies}
                labs={labs}
                labsLoading={records === null}
                strictCarbs={strictCarbs}
                targetCalories={targetCalories}
                macroRows={macroRows}
                meals={meals}
                dietitianFor={dietitianFor}
                avoidFlags={avoidFlags}
                onEdit={() => setEditorOpen(true)}
                onReset={() => setDraft(null)}
              />
            </DetailShell>
          )}
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-4">
        <Info className="w-3.5 h-3.5" />
        General guidance only. Confirm with your doctor or dietitian.
      </p>

      <LogActivityModal
        open={activityOpen}
        weightKg={profile.weightKg}
        onClose={() => setActivityOpen(false)}
        onSave={(kind, minutes) => {
          dayLog.addActivity(kind, minutes);
          setActivityOpen(false);
          onShowToast(`Activity added: ${minutes} min`);
        }}
      />

      <ProfileEditor
        open={editorOpen}
        value={profile}
        vaultValue={vaultProfile}
        isFemale={sex === 'female'}
        onClose={() => setEditorOpen(false)}
        onSave={(next) => {
          setDraft(next);
          setEditorOpen(false);
          onShowToast('Demo profile applied — plan, flags, scans and checkups updated.');
        }}
      />
    </div>
  );
};
