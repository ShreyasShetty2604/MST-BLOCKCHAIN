import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RotateCcw, Leaf, Drumstick } from 'lucide-react';
import { ACTIVITY_LEVELS, ActivityLevel } from '../features/nutrition/calculator';
import { DietType } from '../features/nutrition/dietPlan';

// Editable diet profile (demo). Conditions/allergies are the effective lists used everywhere.
export interface DietProfileDraft {
  weightKg: number;
  heightCm: number;
  activity: ActivityLevel;
  dietType: DietType;
  conditions: string[];
  foodAllergies: string[];
}

export const CONDITION_OPTIONS: { label: string; match: RegExp; femaleOnly?: boolean }[] = [
  { label: 'Type 2 Diabetes', match: /diabet/i },
  { label: 'Hypertension', match: /hypertension|blood pressure/i },
  { label: 'High Cholesterol', match: /cholesterol|hyperlipid|dyslipid/i },
  { label: 'Anaemia', match: /anaemi|anemi/i },
  { label: 'Chronic Kidney Disease (CKD)', match: /kidney|renal|ckd/i },
  { label: 'Pregnancy', match: /pregnan/i, femaleOnly: true }
];

export const FOOD_ALLERGY_OPTIONS = ['Peanuts', 'Tree nuts', 'Milk', 'Gluten', 'Egg', 'Fish', 'Shellfish', 'Soy', 'Sesame', 'Mustard'];

interface ProfileEditorProps {
  open: boolean;
  value: DietProfileDraft;
  vaultValue: DietProfileDraft; // what "Reset to vault" restores
  isFemale: boolean;
  onSave: (draft: DietProfileDraft) => void;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none';

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ open, value, vaultValue, isFemale, onSave, onClose }) => {
  const [weight, setWeight] = useState(String(value.weightKg));
  const [height, setHeight] = useState(String(value.heightCm));
  const [activity, setActivity] = useState<ActivityLevel>(value.activity);
  const [dietType, setDietType] = useState<DietType>(value.dietType);
  const [conditions, setConditions] = useState<string[]>(value.conditions);
  const [allergies, setAllergies] = useState<string[]>(value.foodAllergies);
  const [otherAllergies, setOtherAllergies] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = (v: DietProfileDraft) => {
    setWeight(String(v.weightKg));
    setHeight(String(v.heightCm));
    setActivity(v.activity);
    setDietType(v.dietType);
    setConditions(v.conditions);
    setAllergies(v.foodAllergies.filter((a) => FOOD_ALLERGY_OPTIONS.some((o) => sameText(o, a))));
    setOtherAllergies(v.foodAllergies.filter((a) => !FOOD_ALLERGY_OPTIONS.some((o) => sameText(o, a))).join(', '));
    setError(null);
  };

  useEffect(() => {
    if (open) load(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // A condition option is "on" if any current condition matches it (keeps vault wording, e.g. "Type 2 Diabetes Mellitus").
  const optionOn = (o: (typeof CONDITION_OPTIONS)[number]) => conditions.some((c) => o.match.test(c));
  const toggleCondition = (o: (typeof CONDITION_OPTIONS)[number]) =>
    setConditions((prev) => (optionOn(o) ? prev.filter((c) => !o.match.test(c)) : [...prev, o.label]));
  const otherConditions = conditions.filter((c) => !CONDITION_OPTIONS.some((o) => o.match.test(c)));

  const toggleAllergy = (a: string) =>
    setAllergies((prev) => (prev.some((x) => sameText(x, a)) ? prev.filter((x) => !sameText(x, a)) : [...prev, a]));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Number(weight);
    const h = Number(height);
    if (!(w >= 25 && w <= 250)) return setError('Weight must be between 25 and 250 kg.');
    if (!(h >= 100 && h <= 230)) return setError('Height must be between 100 and 230 cm.');
    const extra = otherAllergies.split(',').map((x) => x.trim()).filter(Boolean);
    onSave({
      weightKg: w,
      heightCm: h,
      activity,
      dietType,
      conditions,
      foodAllergies: [...allergies, ...extra.filter((x) => !allergies.some((a) => sameText(a, x)))]
    });
  };

  // Portal to <body>: ancestors with CSS transforms (e.g. fade-in animations) would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in"
        aria-label="Edit profile (demo)"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-slate-900 dark:text-white">Edit profile (demo)</h3>
            <p className="text-[11px] text-slate-500">Changes apply instantly on this page and are not saved to your vault.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Weight (kg)</span>
              <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
            </label>
            <label>
              <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Height (cm)</span>
              <input type="number" inputMode="decimal" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="block">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Activity level</span>
            <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)} className={inputClass}>
              {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LEVELS[k].label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Diet</span>
            <div className="grid grid-cols-2 gap-2">
              {(['Vegetarian', 'Non-vegetarian'] as DietType[]).map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDietType(d)}
                  className={`py-2 rounded-xl font-semibold border transition-colors ${
                    dietType === d
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    {d === 'Vegetarian' ? <Leaf className="w-4 h-4" /> : <Drumstick className="w-4 h-4" />}
                    {d === 'Vegetarian' ? 'Veg' : 'Non-veg'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Conditions</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONDITION_OPTIONS.map((o) => {
                const disabled = o.femaleOnly && !isFemale;
                return (
                  <label
                    key={o.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                      disabled ? 'opacity-40 cursor-not-allowed' : ''
                    } ${optionOn(o) ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    <input type="checkbox" checked={optionOn(o)} disabled={disabled} onChange={() => toggleCondition(o)} className="accent-teal-700" />
                    <span className="text-slate-800 dark:text-slate-200">{o.label}</span>
                  </label>
                );
              })}
            </div>
            {otherConditions.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1.5">Also on record (unchanged): {otherConditions.join(', ')}</p>
            )}
          </div>

          <div>
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Food allergies</span>
            <div className="flex flex-wrap gap-2">
              {FOOD_ALLERGY_OPTIONS.map((a) => {
                const on = allergies.some((x) => sameText(x, a));
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAllergy(a)}
                    aria-pressed={on}
                    className={`px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                      on
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            <input
              value={otherAllergies}
              onChange={(e) => setOtherAllergies(e.target.value)}
              placeholder="Other food allergies, comma separated"
              className={`${inputClass} mt-2`}
            />
          </div>

          {error && <p className="text-rose-600 dark:text-rose-400 font-semibold">{error}</p>}
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-2 px-5 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => load(vaultValue)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to vault
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};
