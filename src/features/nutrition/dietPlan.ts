// Diet plan content for the Wellness page: meal suggestions, their "why" for the patient's
// condition, and avoid-flags with the rule that triggered each one. Calories come from the
// calculator (a share of the computed daily target), never invented here.

import { evaluateMeal } from './mealScan';

export type GiLevel = 'Low' | 'Med' | 'High';
export type DietType = 'Vegetarian' | 'Non-vegetarian';

type ConditionFocus = 'diabetes' | 'hypertension' | 'heart' | 'anaemia' | 'general';

const FOCUS_TRIGGERS: { focus: Exclude<ConditionFocus, 'general'>; triggers: string[] }[] = [
  { focus: 'diabetes', triggers: ['diabet', 'glyc', 'insulin'] },
  { focus: 'hypertension', triggers: ['hypertension', 'blood pressure'] },
  { focus: 'heart', triggers: ['hyperlipid', 'cholesterol', 'coronary', 'heart', 'cardiac'] },
  { focus: 'anaemia', triggers: ['anaemi', 'anemi'] }
];

// Conditions where diet needs individual clinical supervision: no auto-generated plan.
const NO_AUTO_PLAN = /kidney|renal|ckd|pregnan/i;

export const NO_AUTO_PLAN_MESSAGE = "Please consult a dietitian. We don't auto-generate plans for this condition.";

export function needsDietitian(conditions: string[]): string | null {
  return conditions.find((c) => NO_AUTO_PLAN.test(c)) ?? null;
}

function primaryFocus(conditions: string[]): { focus: ConditionFocus; condition?: string } {
  for (const { focus, triggers } of FOCUS_TRIGGERS) {
    const condition = conditions.find((c) => triggers.some((t) => c.toLowerCase().includes(t)));
    if (condition) return { focus, condition };
  }
  return { focus: 'general' };
}

export interface PlannedMeal {
  type: string;
  time: string;
  emoji: string;
  items: string;
  calories: number;
  gi: GiLevel;
  why: string;
  allergyWarning?: string; // set when an item conflicts with the patient's allergies
}

type MealOption = { items: string; ingredients: string[] };

const MEAL_TEMPLATES: {
  type: string;
  time: string;
  emoji: string;
  share: number;
  gi: GiLevel;
  options: Record<DietType, MealOption>;
  why: Record<ConditionFocus, string>;
}[] = [
  {
    type: 'Breakfast',
    time: '8:30 AM',
    emoji: '🥞',
    share: 0.25,
    gi: 'Low',
    options: {
      Vegetarian: { items: 'Ragi & oats dosa (2) + mint chutney + paneer bhurji (50 g)', ingredients: ['ragi', 'oats', 'urad dal', 'mint', 'paneer'] },
      'Non-vegetarian': { items: 'Ragi & oats dosa (2) + mint chutney + 2 boiled eggs', ingredients: ['ragi', 'oats', 'urad dal', 'mint', 'egg'] }
    },
    why: {
      diabetes: 'Ragi and oats release sugar slowly, so your glucose rises gently',
      hypertension: 'Mint chutney instead of salty coconut chutney keeps sodium low',
      heart: 'Steamed dosa with lean protein keeps saturated fat down',
      anaemia: 'Ragi is one of the most iron- and calcium-rich Indian grains',
      general: 'Fibre plus protein keeps you full until lunch'
    }
  },
  {
    type: 'Mid-morning',
    time: '11:00 AM',
    emoji: '🍎',
    share: 0.05,
    gi: 'Low',
    options: {
      Vegetarian: { items: 'Guava or apple + a glass of chaas (buttermilk)', ingredients: ['guava', 'buttermilk'] },
      'Non-vegetarian': { items: 'Guava or apple + a glass of chaas (buttermilk)', ingredients: ['guava', 'buttermilk'] }
    },
    why: {
      diabetes: 'A low-GI fruit with some protein keeps sugar steady until lunch',
      hypertension: 'Fruit adds potassium — keep the chaas unsalted',
      heart: 'Fibre-rich fruit and low-fat chaas',
      anaemia: 'Guava is rich in vitamin C, which helps you absorb iron',
      general: "A light bridge to lunch so you don't overeat later"
    }
  },
  {
    type: 'Lunch',
    time: '1:30 PM',
    emoji: '🍛',
    share: 0.3,
    gi: 'Med',
    options: {
      Vegetarian: { items: 'Bajra roti (2) + moong dal + bhindi sabzi + cucumber salad', ingredients: ['bajra', 'moong dal', 'okra', 'cucumber'] },
      'Non-vegetarian': { items: 'Bajra roti (2) + chicken curry (100 g, less oil) + cucumber salad', ingredients: ['bajra', 'chicken', 'onion', 'tomato', 'cucumber'] }
    },
    why: {
      diabetes: 'Protein and salad fibre blunt the after-lunch sugar spike',
      hypertension: 'Potassium-rich vegetables help balance sodium',
      heart: 'Lean protein with no cream or ghee-heavy gravy',
      anaemia: 'Bajra and dal/chicken supply iron; add lemon on the salad to absorb more',
      general: 'Balanced whole-grain, protein and vegetable plate'
    }
  },
  {
    type: 'Snack',
    time: '5:00 PM',
    emoji: '🫘',
    share: 0.1,
    gi: 'Low',
    options: {
      Vegetarian: { items: 'Roasted chana (½ cup) + green tea, no sugar', ingredients: ['chana', 'green tea'] },
      'Non-vegetarian': { items: 'Roasted chana (½ cup) + green tea, no sugar', ingredients: ['chana', 'green tea'] }
    },
    why: {
      diabetes: 'High-fibre chana instead of biscuits avoids an evening sugar spike',
      hypertension: 'Unsalted roasted chana — skip the namkeen',
      heart: 'Roasted, not fried, with heart-friendly fibre',
      anaemia: 'Chana is iron-rich — have the tea an hour later, as it blocks iron absorption',
      general: 'A protein-rich snack that curbs evening cravings'
    }
  },
  {
    type: 'Dinner',
    time: '8:00 PM',
    emoji: '🍲',
    share: 0.3,
    gi: 'Low',
    options: {
      Vegetarian: { items: 'Jowar roti + lauki chana dal + steamed sprouts', ingredients: ['jowar', 'lauki', 'chana dal', 'sprouts'] },
      'Non-vegetarian': { items: 'Jowar roti + grilled fish (100 g) + steamed sprouts', ingredients: ['jowar', 'fish', 'sprouts'] }
    },
    why: {
      diabetes: 'A light, low-GI dinner supports a better fasting sugar next morning',
      hypertension: 'Lauki and sprouts are naturally low in sodium',
      heart: 'Steamed and grilled, low in fat, high in fibre',
      anaemia: 'Sprouts add iron and vitamin C together, which helps absorption',
      general: 'Light and easy to digest before sleep'
    }
  }
];

// Returns null when the patient's conditions need a dietitian instead of an auto plan.
export function buildMealPlan(
  dailyCalories: number,
  conditions: string[],
  dietType: DietType,
  allergies: string[] = []
): PlannedMeal[] | null {
  if (needsDietitian(conditions)) return null;
  const { focus, condition } = primaryFocus(conditions);

  return MEAL_TEMPLATES.map((t) => {
    const option = t.options[dietType];
    // Reuse the meal-scan rules engine so the plan never suggests a patient's allergen.
    const check = evaluateMeal(
      { dishes: [{ name: t.type, confidence: 1, visibleIngredients: option.ingredients, hiddenIngredients: [] }] },
      { allergies, conditions: [] }
    ).dishes[0];

    return {
      type: t.type,
      time: t.time,
      emoji: t.emoji,
      items: option.items,
      gi: t.gi,
      calories: Math.round((dailyCalories * t.share) / 10) * 10,
      why: condition ? `${t.why[focus]} (${condition}).` : `${t.why.general}.`,
      allergyWarning: check.verdict === 'avoid' ? `${check.reason} Swap this item.` : undefined
    };
  });
}

// ---------------------------------------------------------------------------
// Avoid flags
// ---------------------------------------------------------------------------

export interface AvoidFlag {
  label: string;
  rule: string; // shown in the "Why?" tooltip
  source: 'condition' | 'allergy';
}

const CONDITION_AVOIDS: { triggers: string[]; avoid: { label: string; because: string }[] }[] = [
  {
    triggers: ['diabet', 'glyc', 'insulin'],
    avoid: [
      { label: 'Sugar & sweets', because: 'raise blood sugar quickly' },
      { label: 'Maida & white bread', because: 'are refined, high-GI carbs' }
    ]
  },
  {
    triggers: ['hypertension', 'blood pressure'],
    avoid: [{ label: 'Pickles, papad & namkeen', because: 'are very high in sodium' }]
  },
  {
    triggers: ['hyperlipid', 'cholesterol', 'coronary', 'heart', 'cardiac'],
    avoid: [
      { label: 'Deep-fried snacks', because: 'add saturated and trans fats' },
      { label: 'Ghee- & cream-heavy gravies', because: 'are high in saturated fat' }
    ]
  },
  {
    triggers: ['anaemi', 'anemi'],
    avoid: [{ label: 'Tea/coffee with meals', because: 'reduce iron absorption' }]
  },
  {
    triggers: ['kidney', 'renal', 'ckd'],
    avoid: [{ label: 'Salty & high-potassium foods', because: 'strain the kidneys' }]
  },
  {
    triggers: ['pregnan'],
    avoid: [
      { label: 'Raw papaya & alcohol', because: 'are unsafe in pregnancy' },
      { label: 'Unpasteurised dairy & raw eggs', because: 'can carry listeria or salmonella' }
    ]
  }
];

// Allergies that aren't foods (medicines, environmental) don't belong in a diet plan.
const NON_FOOD_ALLERGY = /penicillin|amoxicillin|sulfa|aspirin|ibuprofen|antibiotic|drug|dust|mite|pollen|latex|mould|mold|\bpets?\b|dander/i;

export function isFoodAllergy(allergy: string): boolean {
  return !NON_FOOD_ALLERGY.test(allergy);
}

export function deriveAvoidFlags(conditions: string[], allergies: string[]): AvoidFlag[] {
  const flags: AvoidFlag[] = [];

  for (const allergy of allergies) {
    if (!isFoodAllergy(allergy)) continue;
    flags.push({
      label: `${allergy} (allergy)`,
      rule: `Your vault lists a "${allergy}" allergy, so any dish that contains or likely contains it is flagged.`,
      source: 'allergy'
    });
  }

  for (const { triggers, avoid } of CONDITION_AVOIDS) {
    const condition = conditions.find((c) => triggers.some((t) => c.toLowerCase().includes(t)));
    if (!condition) continue;
    for (const a of avoid) {
      flags.push({
        label: a.label,
        rule: `Condition rule: "${condition}" in your vault → limit ${a.label.toLowerCase()}, which ${a.because}.`,
        source: 'condition'
      });
    }
  }

  return flags;
}
