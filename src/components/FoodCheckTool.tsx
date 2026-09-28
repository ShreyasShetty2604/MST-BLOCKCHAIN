import React, { useMemo, useRef, useState } from 'react';
import { Search, Loader2, Sparkles, Database, Lightbulb, AlertTriangle } from 'lucide-react';
import { FOOD_DB, FoodTags, findFood, classifyFood, classifyFoodWithGemini, NotAFoodError } from '../features/nutrition/foodCheck';
import { isFoodAllergy } from '../features/nutrition/dietPlan';
import { GeminiError, hasGeminiKey } from '../features/nutrition/mealScan';
import { VERDICT_TONE } from './VerdictBadge';

const EXAMPLES = ['samosa', 'banana', 'poha', 'gulab jamun', 'masala chai'];

interface FoodCheckToolProps {
  conditions: string[];
  allergies: string[];
}


export const FoodCheckTool: React.FC<FoodCheckToolProps> = ({ conditions, allergies }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [found, setFound] = useState<{ food: FoodTags; source: 'list' | 'ai' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Verdict is re-derived from the tags, so it updates instantly when the profile changes.
  const profileKey = JSON.stringify([conditions, allergies]);
  const verdict = useMemo(
    () => (found ? classifyFood(found.food, { conditions, allergies }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [found, profileKey]
  );

  const check = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    const id = ++requestId.current;
    setQuery(q);
    setError(null);

    const local = findFood(q);
    if (local) {
      setFound({ food: local, source: 'list' });
      setStatus('done');
      return;
    }
    if (!hasGeminiKey()) {
      setFound(null);
      setStatus('error');
      setError(`"${q}" isn't in our list of common foods yet. Try a common name, e.g. "poha" or "dal".`);
      return;
    }

    setFound(null);
    setStatus('loading');
    try {
      const food = await classifyFoodWithGemini(q);
      if (id !== requestId.current) return;
      setFound({ food, source: 'ai' });
      setStatus('done');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus('error');
      setError(
        err instanceof NotAFoodError
          ? `"${q}" doesn't look like a food or drink.`
          : `Couldn't check "${q}"${err instanceof GeminiError ? `: ${err.message}` : ''}. Try a common name.`
      );
    }
  };

  const tone = verdict ? VERDICT_TONE[verdict.verdict] : null;
  const VerdictIcon = tone?.icon;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            list="food-check-suggestions"
            placeholder="e.g. samosa, banana, poha"
            aria-label="Food to check"
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          <datalist id="food-check-suggestions">
            {FOOD_DB.map((food) => (
              <option key={food.name} value={food.name} />
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || !query.trim()}
          className="h-11 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          Check
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => check(ex)}
            className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-800 dark:hover:text-teal-300 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          "{query}" isn't in our list — asking Gemini to tag it…
        </p>
      )}

      {status === 'error' && error && <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>}

      {status === 'done' && found && verdict && tone && VerdictIcon && (
        <div className={`rounded-2xl p-4 space-y-3 animate-fade-in ${tone.soft}`}>
          <div className="flex items-start gap-3">
            <VerdictIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold">
                {found.food.name} · {tone.label}
              </p>
              <p className="text-sm">{verdict.reason}</p>
            </div>
          </div>

          <div className="pl-8 space-y-2 text-xs opacity-90">
            <p>
              GI {found.food.gi} · Sugar {found.food.sugar} · Salt {found.food.salt} · Fat {found.food.fat}
              {found.food.allergens.length > 0 && ` · Allergens: ${found.food.allergens.join(', ')}`}
            </p>
            {found.source === 'ai' && allergies.some(isFoodAllergy) && verdict.verdict !== 'avoid' && (
              <p className="flex items-start gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                AI estimate — recipes vary and allergens can be missed. With your food allergies, confirm the ingredients first.
              </p>
            )}
            {verdict.verdict === 'clear' && found.food.better && (
              <p className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Even better: {found.food.better}.
              </p>
            )}
            <p className="flex items-center gap-1.5 opacity-75">
              {found.source === 'list' ? <Database className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {found.source === 'list' ? 'From the built-in food list' : 'AI-estimated tags (Gemini), checked with the same rules'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
