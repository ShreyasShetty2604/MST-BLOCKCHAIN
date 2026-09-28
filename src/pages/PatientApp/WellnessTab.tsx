import React, { useEffect, useMemo, useState } from 'react';
import { Sun, ScanLine, Salad, CalendarCheck, Info, TrendingDown } from 'lucide-react';
import { PatientPersona, MedicalRecord } from '../../mock/types';
import { ProfileEditor, DietProfileDraft } from '../../components/ProfileEditor';
import { mockApi } from '../../mock/api';
import {
  calculateBmi, classifyBmiAsian, calculateBmr, calculateTdee, calculateCalorieTarget,
  ActivityLevel, BmiCategory, Sex
} from '../../features/nutrition/calculator';
import { buildMealPlan, deriveAvoidFlags, isFoodAllergy, needsDietitian } from '../../features/nutrition/dietPlan';
import { readLabInsights, deriveCheckups, STRICT_CARB_HBA1C } from '../../features/nutrition/recordInsights';
import { TabBar, TabDef } from './wellness/ui';
import { TodayView, WellnessTabId } from './wellness/TodayView';
import { ScanView } from './wellness/ScanView';
import { PlanView } from './wellness/PlanView';
import { CheckupsView } from './wellness/CheckupsView';
import { ProgressView } from './wellness/ProgressView';
import { todayLog, todayMacroIntake, hba1cTrend, weightTrend, weeklyAdherence } from '../../features/nutrition/demoProgress';

interface WellnessTabProps {
  persona: PatientPersona;
  onShowToast: (msg: string) => void;
}

const TABS: TabDef<WellnessTabId>[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'scan', label: 'Scan meal', icon: ScanLine },
  { id: 'plan', label: 'Diet plan', icon: Salad },
  { id: 'progress', label: 'Progress', icon: TrendingDown },
  { id: 'checkups', label: 'Checkups', icon: CalendarCheck }
];

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

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// Per-patient scan counter for today (browser-local; purely a convenience stat).
function scanCountKey(personaId: string) {
  return `medivault_meal_scans_${personaId}_${new Date().toISOString().slice(0, 10)}`;
}
function readScanCount(personaId: string): number {
  try {
    return Number(localStorage.getItem(scanCountKey(personaId))) || 0;
  } catch {
    return 0;
  }
}

export const WellnessTab: React.FC<WellnessTabProps> = ({ persona, onShowToast }) => {
  const [tab, setTab] = useState<WellnessTabId>('today');
  const [records, setRecords] = useState<MedicalRecord[] | null>(null);
  const [scansToday, setScansToday] = useState(() => readScanCount(persona.id));
  const [draft, setDraft] = useState<DietProfileDraft | null>(null); // demo edits; null = vault values
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    // Same records the Records page shows; they drive the plan adjustments and the checkups.
    let cancelled = false;
    setRecords(null);
    mockApi.getRecords('All', persona.id).then((r) => !cancelled && setRecords(r));
    setScansToday(readScanCount(persona.id));
    setDraft(null);
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

  // Demo visuals, anchored to real data where it exists (seeded per patient, labelled "Demo data").
  const log = useMemo(() => todayLog(meals ?? []), [meals]);
  const intake = useMemo(() => todayMacroIntake(log.eatenCalories, split, persona.id), [log.eatenCalories, split, persona.id]);
  const macroRows = macros.map((m) => {
    const eaten = intake.find((i) => i.name === m.name)!;
    return { name: m.name, grams: eaten.grams, percent: eaten.percent, targetPercent: m.percent };
  });
  const macroProgress = macros.map((m) => ({ name: m.name, eaten: intake.find((i) => i.name === m.name)!.grams, target: m.grams }));
  const isDiabetic = conditions.some((c) => /diabet|glyc|insulin/i.test(c));
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

  const handleScanComplete = () => {
    const next = scansToday + 1;
    setScansToday(next);
    try {
      localStorage.setItem(scanCountKey(persona.id), String(next));
    } catch {
      /* storage unavailable: count stays in memory */
    }
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Wellness · {today}</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {greeting()}, {persona.name.split(' ')[0]}
          </h1>
        </div>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
      </header>

      <div key={tab} className="animate-fade-in">
        {tab === 'today' && (
          <TodayView
            personaId={persona.id}
            bmi={bmi}
            targetCalories={dietitianFor ? null : targetCalories}
            eatenCalories={log.eatenCalories}
            macroProgress={macroProgress}
            meals={meals}
            logged={log.logged}
            nextCheckup={nextCheckup}
            checkupsLoading={checkups === null}
            scansToday={scansToday}
            onNavigate={setTab}
          />
        )}

        {tab === 'scan' && <ScanView persona={effectivePersona} onScanComplete={handleScanComplete} dailyReference={dailyReference} />}

        {tab === 'plan' && (
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
        )}

        {tab === 'progress' && (
          <ProgressView hba1c={hba1c} weight={weight} adherence={adherence} mealTypes={(meals ?? []).map((m) => m.type)} />
        )}

        {tab === 'checkups' && (
          <CheckupsView checkups={checkups} records={records} onTestReminder={() => onShowToast('Push notification test sent to registered mobile device!')} />
        )}
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500 pt-4">
        <Info className="w-3.5 h-3.5" />
        General guidance only. Confirm with your doctor or dietitian.
      </p>

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
