import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Info, RotateCcw, Sparkles, ChefHat, ScanLine, CheckCircle2 } from 'lucide-react';
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
  MealVerdict,
  Verdict
} from '../features/nutrition/mealScan';

interface MealScanCardProps {
  persona: PatientPersona;
}

const VERDICT_STYLES: Record<Verdict, { emoji: string; label: string; banner: string; tag: string }> = {
  avoid: {
    emoji: '🔴',
    label: 'Avoid',
    banner: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200',
    tag: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
  },
  caution: {
    emoji: '🟡',
    label: 'Caution',
    banner: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
    tag: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900'
  },
  clear: {
    emoji: '🟢',
    label: 'No visible allergens',
    banner: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300',
    tag: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
  }
};

const SCAN_STEPS: { id: ScanStep; label: string }[] = [
  { id: 'reading', label: 'Reading photo…' },
  { id: 'identifying', label: 'Identifying dishes…' },
  { id: 'checking', label: 'Checking your allergies…' }
];

const OVERALL_TEXT: Record<Verdict, string> = {
  avoid: 'Avoid this meal — it contains or likely contains something you are allergic to.',
  caution: 'Caution — parts of this meal conflict with your health conditions.',
  clear: 'No visible allergens detected. Ask how it was prepared.'
};

export const MealScanCard: React.FC<MealScanCardProps> = ({ persona }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [step, setStep] = useState<ScanStep>('reading');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MealVerdict | null>(null);
  const [demo, setDemo] = useState<DemoMeal | null>(null);
  const requestId = useRef(0);

  const profile: DietProfile = {
    allergies: persona.emergencyInfo.allergies,
    conditions: persona.emergencyInfo.conditions
  };
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
    setResult(null);
    setDemo(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same photo
    if (!file) return;

    const id = ++requestId.current;
    setPhotoUrl(URL.createObjectURL(file));
    setDemo(null);
    setResult(null);
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
      setResult(evaluateMeal(analysis, profile));
      setStatus('done');
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
    setResult(evaluateMeal(meal.analysis, mergeProfiles(profile, meal.demoProfile)));
    setStatus('done');
  }

  const demoAssumptions = demo ? demoOnlyItems(profile, demo.demoProfile) : [];

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <ScanLine className="w-4 h-4 text-teal-600" />
            <span>Scan my meal</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Snap your plate — we check every ingredient against your vault allergies and conditions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(photoUrl || result) && status !== 'loading' && (
            <button
              onClick={reset}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <label
            className={`px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer ${
              status === 'loading' ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <Camera className="w-4 h-4" />
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
        </div>
      </div>

      {/* Idle state */}
      {status === 'idle' && !photoUrl && (
        <div className="p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
          <Camera className="w-6 h-6 mx-auto text-slate-400 mb-2" />
          Take a photo of your plate or upload one from your gallery.
        </div>
      )}

      {/* Preview + loading */}
      {photoUrl && status !== 'done' && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-md">
          <img src={photoUrl} alt="Your meal" className="w-full max-h-72 object-cover" />
          {status === 'loading' && (
            <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-3 text-white">
              <span className="text-sm font-bold">Analysing your meal…</span>
              <ol className="space-y-1.5 text-xs">
                {SCAN_STEPS.map((s, idx) => {
                  const current = SCAN_STEPS.findIndex((x) => x.id === step);
                  const state = idx < current ? 'done' : idx === current ? 'active' : 'todo';
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center gap-2 ${state === 'todo' ? 'text-slate-400' : state === 'done' ? 'text-emerald-300' : 'font-semibold'}`}
                    >
                      {state === 'done' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : state === 'active' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-500" />
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

      {/* Error */}
      {status === 'error' && error && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Demo fallback */}
      {showDemo && status !== 'loading' && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Try a demo meal</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_MEALS.map((meal) => (
              <button
                key={meal.id}
                onClick={() => runDemo(meal)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  demo?.id === meal.id
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                }`}
              >
                {meal.emoji} {meal.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {status === 'done' && result && (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_1fr] gap-4 animate-fade-in">
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 aspect-[4/3] md:aspect-square flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="Your meal" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-6xl block">{demo?.emoji}</span>
                <span className="text-[10px] font-mono text-slate-400 mt-2 block">DEMO MEAL</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className={`p-3 rounded-xl border text-sm font-bold flex items-start gap-2 ${VERDICT_STYLES[result.overall].banner}`}>
              <span>{VERDICT_STYLES[result.overall].emoji}</span>
              <span>{OVERALL_TEXT[result.overall]}</span>
            </div>

            {demoAssumptions.length > 0 && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-300 font-mono">
                Demo result · assumes: {demoAssumptions.join(', ')}
              </p>
            )}

            <ul className="space-y-2">
              {result.dishes.map((d, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {d.dish.name}
                      <span className="ml-2 text-[10px] font-mono text-slate-400">
                        {Math.round(d.dish.confidence * 100)}% match
                      </span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${VERDICT_STYLES[d.verdict].tag}`}>
                      {VERDICT_STYLES[d.verdict].emoji} {VERDICT_STYLES[d.verdict].label}
                    </span>
                  </div>
                  {d.dish.packaged && (
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                      {d.dish.brand && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">{d.dish.brand}</span>
                      )}
                      {d.dish.labelText && (
                        <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">"{d.dish.labelText}"</span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        Sweeteners: {d.dish.sweeteners?.length ? d.dish.sweeteners.join(', ') : 'none listed'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        Caffeine: {d.dish.caffeine ? 'yes' : 'no'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        Sodium: {d.dish.sodium ?? 'unknown'}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300">{d.reason}</p>
                  {d.suggestion && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">💡 {d.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>

            {result.overall === 'clear' && (
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2">
                <ChefHat className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Ask how it was prepared</strong> — oils, pastes and garnishes aren't always visible in a photo.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer — always visible once there is a result */}
      {status === 'done' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            AI photo analysis can miss ingredients. If you have a severe allergy, always confirm with whoever made the food.
          </span>
        </div>
      )}
    </div>
  );
};
