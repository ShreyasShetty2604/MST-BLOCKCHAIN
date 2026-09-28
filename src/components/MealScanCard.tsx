import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Info, RotateCcw, Sparkles, ChefHat, ScanLine, CheckCircle2, UtensilsCrossed, Package, Check, X } from 'lucide-react';
import { PatientPersona } from '../mock/types';
import {
  analyseMealPhoto,
  evaluateMeal,
  hasGeminiKey,
  GeminiError,
  ScanStep,
  mergeProfiles,
  demoOnlyItems,
  DEMO_MEALS,
  DemoMeal,
  DietProfile,
  MealAnalysis,
  Verdict
} from '../features/nutrition/mealScan';
import { VERDICT_TONE, VerdictBadge } from './VerdictBadge';
import { NutritionBars, DailyReference } from './NutritionBars';

interface MealScanCardProps {
  persona: PatientPersona;
  onScanComplete?: (verdict: Verdict) => void; // e.g. to count today's scans
  dailyReference?: DailyReference; // enables the nutrition-estimate chart
}

// Large verdict mark: ✓ / ! / ✕ — the icon and the headline carry the meaning with the colour.
const BIG_MARK: Record<Verdict, { glyph: React.ReactNode; ring: string; title: string }> = {
  clear: { glyph: <Check className="w-8 h-8" strokeWidth={3} />, ring: 'bg-emerald-500 text-white', title: 'No visible allergens' },
  caution: { glyph: <span className="text-3xl font-bold leading-none">!</span>, ring: 'bg-amber-500 text-white', title: 'Caution' },
  avoid: { glyph: <X className="w-8 h-8" strokeWidth={3} />, ring: 'bg-rose-500 text-white', title: 'Avoid' }
};

const DISH_LABEL: Record<Verdict, string> = { avoid: 'Avoid', caution: 'Caution', clear: 'No visible allergens' };

const SCAN_STEPS: { id: ScanStep; label: string }[] = [
  { id: 'reading', label: 'Reading photo…' },
  { id: 'identifying', label: 'Identifying dishes…' },
  { id: 'checking', label: 'Checking your allergies…' }
];

// Detail line under the big verdict headline (the headline already says Avoid / Caution).
const OVERALL_DETAIL: Record<Verdict, string> = {
  avoid: 'It contains or likely contains something you are allergic to.',
  caution: 'Parts of this meal conflict with your health conditions.',
  clear: 'No visible allergens detected. Ask how it was prepared.'
};

export const MealScanCard: React.FC<MealScanCardProps> = ({ persona, onScanComplete, dailyReference }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [step, setStep] = useState<ScanStep>('reading');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null); // what Gemini (or a demo) saw
  const [demo, setDemo] = useState<DemoMeal | null>(null);
  const requestId = useRef(0);

  const profile: DietProfile = {
    allergies: persona.emergencyInfo.allergies,
    conditions: persona.emergencyInfo.conditions
  };
  // Verdicts are re-derived from the stored analysis, so they update instantly when the profile changes.
  const profileKey = JSON.stringify(profile);
  const result = useMemo(
    () => (analysis ? evaluateMeal(analysis, demo ? mergeProfiles(profile, demo.demoProfile) : profile) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis, demo, profileKey]
  );
  const keyMissing = !hasGeminiKey();
  const showDemo = keyMissing || status === 'error' || demo !== null;

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  // A different patient means different rules — clear the previous verdict.
  useEffect(() => reset(), [persona.id]);

  function reset() {
    requestId.current++;
    setPhotoUrl(null);
    setStatus('idle');
    setError(null);
    setAnalysis(null);
    setDemo(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same photo
    if (!file) return;

    const id = ++requestId.current;
    setPhotoUrl(URL.createObjectURL(file));
    setDemo(null);
    setAnalysis(null);
    setError(null);

    if (keyMissing) {
      setStatus('error');
      setError('Photo analysis is not configured on this device.');
      return;
    }

    setStatus('loading');
    setStep('reading');
    try {
      const analysis = await analyseMealPhoto(file, (s) => id === requestId.current && setStep(s));
      if (id !== requestId.current) return;
      if (analysis.noFood) {
        setStatus('error');
        setError('No food detected, try a clearer photo.');
        return;
      }
      setStep('checking');
      await new Promise((r) => requestAnimationFrame(r)); // let the step render; the rules check itself is instant
      if (id !== requestId.current) return;
      setAnalysis(analysis);
      setStatus('done');
      onScanComplete?.(evaluateMeal(analysis, profile).overall);
    } catch (err) {
      if (id !== requestId.current) return;
      console.error('Meal scan failed', err);
      setStatus('error');
      setError(
        err instanceof GeminiError
          ? `We could not analyse this photo: ${err.message}.`
          : 'We could not analyse this photo right now.'
      );
    }
  }

  function runDemo(meal: DemoMeal) {
    requestId.current++;
    setPhotoUrl(null);
    setError(null);
    setDemo(meal);
    setAnalysis(meal.analysis);
    setStatus('done');
    onScanComplete?.(evaluateMeal(meal.analysis, mergeProfiles(profile, meal.demoProfile)).overall);
  }

  const demoAssumptions = demo ? demoOnlyItems(profile, demo.demoProfile) : [];

  const OverallIcon = result ? VERDICT_TONE[result.overall].icon : null;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-card dark:shadow-none dark:ring-1 dark:ring-white/[0.06] p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
          <ScanLine className="w-7 h-7" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">Scan my meal</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Snap your plate — we check every ingredient against your allergies and conditions.
          </p>
        </div>
      </div>

      {/* Idle state */}
      {status === 'idle' && !photoUrl && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 py-10 px-6 flex flex-col items-center text-center gap-2">
          <Camera className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Point your camera at your plate, or upload a photo from your gallery.</p>
        </div>
      )}

      {/* Preview + loading */}
      {photoUrl && status !== 'done' && (
        <div className="relative rounded-2xl overflow-hidden">
          <img src={photoUrl} alt="Your meal" className="w-full max-h-80 object-cover" />
          {status === 'loading' && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 text-white">
              <span className="text-base font-semibold">Analysing your meal…</span>
              <ol className="space-y-2 text-sm">
                {SCAN_STEPS.map((s, idx) => {
                  const current = SCAN_STEPS.findIndex((x) => x.id === step);
                  const state = idx < current ? 'done' : idx === current ? 'active' : 'todo';
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center gap-2 transition-opacity ${state === 'todo' ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {state === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-300" />
                      ) : state === 'active' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-white/50" />
                      )}
                      <span>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label
          className={`flex-1 h-12 px-6 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.99] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
            status === 'loading' ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Take photo / Upload</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
            disabled={status === 'loading'}
          />
        </label>
        {(photoUrl || result) && status !== 'loading' && (
          <button
            onClick={reset}
            className="h-12 px-5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Error */}
      {status === 'error' && error && (
        <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      )}

      {/* Demo fallback */}
      {showDemo && status !== 'loading' && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            Try a demo meal
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_MEALS.map((meal) => (
              <button
                key={meal.id}
                onClick={() => runDemo(meal)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  demo?.id === meal.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300'
                }`}
              >
                {meal.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {status === 'done' && result && OverallIcon && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 items-stretch">
            <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800/50 aspect-[4/3] sm:aspect-auto sm:min-h-[180px] flex items-center justify-center">
              {photoUrl ? (
                <img src={photoUrl} alt="Your meal" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <UtensilsCrossed className="w-8 h-8" />
                  <span className="text-xs font-medium">Demo meal</span>
                </div>
              )}
            </div>

            <div className={`h-full rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 ${VERDICT_TONE[result.overall].soft}`}>
              <span className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${BIG_MARK[result.overall].ring}`} aria-hidden>
                {BIG_MARK[result.overall].glyph}
              </span>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{BIG_MARK[result.overall].title}</p>
                <p className="text-sm">{OVERALL_DETAIL[result.overall]}</p>
                {demoAssumptions.length > 0 && <p className="text-xs opacity-80">Demo result · assumes: {demoAssumptions.join(', ')}</p>}
              </div>
            </div>
          </div>

          <ul className="grid grid-cols-1 gap-3">
            {result.dishes.map((d, idx) => (
              <li key={idx} className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.dish.name}</p>
                  <VerdictBadge verdict={d.verdict} label={DISH_LABEL[d.verdict]} />
                </div>
                <div className="flex items-center gap-2" title={`Recognition confidence ${Math.round(d.dish.confidence * 100)}%`}>
                  <span className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <span className="block h-full rounded-full bg-teal-600 dark:bg-teal-400" style={{ width: `${Math.round(d.dish.confidence * 100)}%` }} />
                  </span>
                  <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{Math.round(d.dish.confidence * 100)}% match</span>
                </div>
                {d.dish.packaged && (
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <Package className="w-3.5 h-3.5" />
                    {[
                      d.dish.brand,
                      d.dish.labelText && `"${d.dish.labelText}"`,
                      `Sweeteners: ${d.dish.sweeteners?.length ? d.dish.sweeteners.join(', ') : 'none listed'}`,
                      `Caffeine: ${d.dish.caffeine ? 'yes' : 'no'}`,
                      `Sodium: ${d.dish.sodium ?? 'unknown'}`
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300">{d.reason}</p>
                {d.suggestion && <p className="text-xs text-slate-500 dark:text-slate-400">Tip: {d.suggestion}</p>}
              </li>
            ))}
          </ul>

          {analysis?.nutrition && dailyReference && <NutritionBars estimate={analysis.nutrition} daily={dailyReference} />}

          {result.overall === 'clear' && (
            <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <ChefHat className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong className="font-semibold">Ask how it was prepared</strong> — oils, pastes and garnishes aren't always visible in a photo.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Disclaimer — always visible once there is a result */}
      {status === 'done' && (
        <p className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3">
          <Info className="w-4 h-4 shrink-0" />
          <span>AI photo analysis can miss ingredients. If you have a severe allergy, always confirm with whoever made the food.</span>
        </p>
      )}
    </div>
  );
};
