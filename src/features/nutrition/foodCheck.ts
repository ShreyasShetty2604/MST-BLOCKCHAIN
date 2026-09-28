// "Can I eat this?" and Smart swaps. Foods are described by tags (GI, sugar, salt, fat, allergens);
// the verdict is always decided by classifyFood() below, whether the tags came from the built-in
// list or from Gemini — so both sources follow exactly the same rules.

import { findAllergenConflict, generateGeminiJson, Verdict } from './mealScan';

export type Level = 'low' | 'med' | 'high';
export type GiLevel = 'Low' | 'Med' | 'High';
export type FoodFlag = 'caffeine' | 'high-potassium' | 'raw-papaya' | 'alcohol';

// Allergen vocabulary; each word belongs to an allergen group in the meal-scan rules engine.
export const ALLERGEN_TERMS = ['peanut', 'cashew', 'milk', 'wheat', 'egg', 'fish', 'prawn', 'soy', 'sesame', 'mustard', 'coconut'] as const;

export interface FoodTags {
  name: string;
  aliases?: string[];
  gi: GiLevel;
  sugar: Level;
  salt: Level;
  fat: Level;
  allergens: string[];
  flags?: FoodFlag[];
  better?: string; // healthier alternative
}

const f = (
  name: string,
  gi: GiLevel,
  sugar: Level,
  salt: Level,
  fat: Level,
  allergens: string[] = [],
  extra: Partial<Pick<FoodTags, 'aliases' | 'flags' | 'better'>> = {}
): FoodTags => ({ name, gi, sugar, salt, fat, allergens, ...extra });

// ~65 common Indian foods. Levels are typical home/restaurant preparations, not lab values.
export const FOOD_DB: FoodTags[] = [
  // Grains & breads
  f('White rice', 'High', 'low', 'low', 'low', [], { aliases: ['rice', 'steamed rice', 'chawal', 'plain rice'], better: 'brown rice or millets' }),
  f('Brown rice', 'Med', 'low', 'low', 'low'),
  f('Millets', 'Low', 'low', 'low', 'low', [], { aliases: ['millet', 'foxtail millet', 'kodo millet', 'little millet'] }),
  f('Jeera rice', 'High', 'low', 'med', 'med', ['milk'], { better: 'brown rice or millet pulao' }),
  f('Veg pulao', 'High', 'low', 'med', 'med', [], { aliases: ['pulao', 'pulav'], better: 'millet pulao with extra vegetables' }),
  f('Biryani', 'High', 'low', 'high', 'high', ['milk', 'cashew'], { aliases: ['chicken biryani', 'veg biryani', 'mutton biryani'], better: 'a small portion with raita and salad' }),
  f('Khichdi', 'Med', 'low', 'med', 'low', ['milk']),
  f('Roti', 'Med', 'low', 'low', 'low', ['wheat'], { aliases: ['chapati', 'phulka', 'wheat roti'] }),
  f('Multigrain roti', 'Low', 'low', 'low', 'low', ['wheat'], { aliases: ['multigrain chapati'] }),
  f('Maida roti', 'High', 'low', 'med', 'med', ['wheat', 'milk'], { aliases: ['naan', 'butter naan', 'rumali roti', 'kulcha'], better: 'multigrain roti' }),
  f('Bajra roti', 'Low', 'low', 'low', 'low', [], { aliases: ['bajra'] }),
  f('Jowar roti', 'Low', 'low', 'low', 'low', [], { aliases: ['jowar', 'jowar bhakri'] }),
  f('Ragi roti', 'Low', 'low', 'low', 'low', [], { aliases: ['ragi', 'ragi mudde', 'nachni'] }),
  f('Paratha', 'Med', 'low', 'med', 'high', ['wheat', 'milk'], { aliases: ['aloo paratha', 'parantha'], better: 'plain roti with a vegetable' }),
  f('Puri', 'High', 'low', 'med', 'high', ['wheat'], { aliases: ['poori'], better: 'roti' }),
  f('White bread', 'High', 'low', 'med', 'low', ['wheat'], { aliases: ['bread', 'bread toast', 'pav'], better: 'multigrain bread' }),
  f('Multigrain bread', 'Med', 'low', 'med', 'low', ['wheat'], { aliases: ['brown bread', 'whole wheat bread'] }),
  f('Oats', 'Low', 'low', 'low', 'low', [], { aliases: ['oatmeal', 'oats porridge'] }),
  f('Instant noodles', 'High', 'low', 'high', 'high', ['wheat'], { aliases: ['maggi', 'noodles'], better: 'vegetable poha or oats upma' }),

  // South Indian & breakfast
  f('Idli', 'High', 'low', 'low', 'low', [], { better: 'ragi or oats idli' }),
  f('Plain dosa', 'Med', 'low', 'low', 'med', [], { aliases: ['dosa', 'dosai'] }),
  f('Masala dosa', 'High', 'low', 'med', 'high', ['mustard'], { flags: ['high-potassium'], better: 'plain ragi dosa with sambar' }),
  f('Medu vada', 'Med', 'low', 'med', 'high', [], { aliases: ['vada', 'vadai'], better: 'idli' }),
  f('Upma', 'Med', 'low', 'med', 'med', ['wheat', 'cashew', 'mustard'], { aliases: ['rava upma', 'sooji upma'], better: 'oats or millet upma' }),
  f('Poha', 'Med', 'low', 'med', 'med', ['peanut', 'mustard'], { aliases: ['aval', 'kanda poha'], better: 'poha with extra vegetables and sprouts' }),
  f('Sambar', 'Low', 'low', 'med', 'low', ['mustard']),
  f('Coconut chutney', 'Low', 'low', 'med', 'med', ['coconut']),
  f('Peanut chutney', 'Low', 'low', 'med', 'med', ['peanut']),
  f('Dhokla', 'Med', 'med', 'med', 'low', ['mustard'], { aliases: ['khaman'] }),

  // Snacks & street food
  f('Samosa', 'High', 'low', 'high', 'high', ['wheat'], { better: 'roasted chana' }),
  f('Pakora', 'Med', 'low', 'high', 'high', [], { aliases: ['pakoda', 'bhaji', 'bajji', 'onion bhaji'], better: 'roasted chana or makhana' }),
  f('Kachori', 'High', 'low', 'high', 'high', ['wheat'], { better: 'roasted chana' }),
  f('Namkeen', 'Med', 'low', 'high', 'high', ['peanut'], { aliases: ['bhujia', 'mixture', 'chivda', 'farsan'], better: 'roasted makhana' }),
  f('Pani puri', 'High', 'low', 'high', 'med', ['wheat'], { aliases: ['golgappa', 'puchka'], better: 'sprouts chaat' }),
  f('Vada pav', 'High', 'low', 'high', 'high', ['wheat'], { better: 'moong dal chilla' }),
  f('Pav bhaji', 'High', 'low', 'high', 'high', ['wheat', 'milk'], { flags: ['high-potassium'], better: 'bhaji with multigrain roti, less butter' }),
  f('Chole bhature', 'High', 'low', 'high', 'high', ['wheat'], { better: 'chole with roti or brown rice' }),
  f('Roasted chana', 'Low', 'low', 'low', 'low', [], { aliases: ['chana', 'bhuna chana', 'roasted gram'] }),
  f('Makhana', 'Low', 'low', 'low', 'low', [], { aliases: ['fox nuts', 'roasted makhana'] }),
  f('Sprouts salad', 'Low', 'low', 'low', 'low', [], { aliases: ['sprouts', 'sprouts chaat', 'moong sprouts'] }),
  f('Pickle', 'Low', 'low', 'high', 'high', ['mustard'], { aliases: ['achar', 'achaar'], better: 'fresh mint or tomato chutney' }),
  f('Papad', 'Med', 'low', 'high', 'low', [], { aliases: ['papadum', 'papadam'], better: 'a cucumber salad' }),

  // Dals, curries & mains
  f('Dal', 'Low', 'low', 'med', 'low', [], { aliases: ['dal tadka', 'moong dal', 'toor dal', 'dal fry'] }),
  f('Rajma chawal', 'Med', 'low', 'med', 'low', [], { aliases: ['rajma'] }),
  f('Chana masala', 'Low', 'low', 'med', 'med', [], { aliases: ['chole', 'chickpea curry'] }),
  f('Palak paneer', 'Low', 'low', 'med', 'med', ['milk']),
  f('Paneer butter masala', 'Low', 'med', 'high', 'high', ['milk', 'cashew'], { aliases: ['shahi paneer', 'paneer makhani'], better: 'palak paneer or dal' }),
  f('Butter chicken', 'Low', 'med', 'high', 'high', ['milk', 'cashew'], { aliases: ['murgh makhani'], better: 'tandoori chicken' }),
  f('Chicken curry', 'Low', 'low', 'med', 'med', [], { aliases: ['chicken'] }),
  f('Tandoori chicken', 'Low', 'low', 'med', 'low', ['milk'], { aliases: ['chicken tikka'] }),
  f('Fish curry', 'Low', 'low', 'med', 'med', ['fish', 'coconut', 'mustard'], { aliases: ['fish'] }),
  f('Prawn curry', 'Low', 'low', 'med', 'med', ['prawn', 'coconut'], { aliases: ['prawns', 'shrimp curry'] }),
  f('Boiled egg', 'Low', 'low', 'low', 'low', ['egg'], { aliases: ['egg', 'eggs', 'omelette', 'egg bhurji'] }),
  f('Aloo sabzi', 'High', 'low', 'med', 'med', [], { aliases: ['potato curry', 'aloo'], flags: ['high-potassium'], better: 'a leafy or gourd sabzi' }),
  f('Bhindi sabzi', 'Low', 'low', 'med', 'med', [], { aliases: ['bhindi', 'okra'] }),

  // Dairy & drinks
  f('Curd', 'Low', 'low', 'low', 'low', ['milk'], { aliases: ['dahi', 'yogurt', 'raita'] }),
  f('Buttermilk', 'Low', 'low', 'med', 'low', ['milk'], { aliases: ['chaas', 'mattha'] }),
  f('Sweet lassi', 'Med', 'high', 'low', 'med', ['milk'], { aliases: ['lassi', 'mango lassi'], better: 'plain chaas' }),
  f('Sweetened chai', 'Med', 'high', 'low', 'low', ['milk'], { aliases: ['chai', 'tea', 'masala chai', 'milk tea'], flags: ['caffeine'], better: 'unsweetened chai' }),
  f('Unsweetened chai', 'Low', 'low', 'low', 'low', ['milk'], { aliases: ['chai without sugar', 'tea without sugar'], flags: ['caffeine'] }),
  f('Filter coffee', 'Med', 'high', 'low', 'low', ['milk'], { aliases: ['coffee'], flags: ['caffeine'], better: 'coffee without sugar' }),
  f('Green tea', 'Low', 'low', 'low', 'low', [], { flags: ['caffeine'] }),
  f('Soft drink', 'High', 'high', 'low', 'low', [], { aliases: ['cola', 'coke', 'pepsi', 'soda'], flags: ['caffeine'], better: 'nimbu pani without sugar' }),
  f('Coconut water', 'Low', 'low', 'low', 'low', ['coconut'], { aliases: ['nariyal pani'], flags: ['high-potassium'] }),
  f('Beer', 'Med', 'low', 'low', 'low', ['wheat'], { aliases: ['alcohol', 'wine', 'whisky', 'rum'], flags: ['alcohol'] }),

  // Fruit
  f('Banana', 'Med', 'med', 'low', 'low', [], { aliases: ['bananas', 'kela'], flags: ['high-potassium'] }),
  f('Mango', 'Med', 'high', 'low', 'low', [], { aliases: ['aam'], better: 'a small portion, or guava' }),
  f('Apple', 'Low', 'med', 'low', 'low', []),
  f('Guava', 'Low', 'low', 'low', 'low', [], { aliases: ['amrood'] }),
  f('Papaya', 'Med', 'med', 'low', 'low', [], { aliases: ['ripe papaya'] }),
  f('Raw papaya', 'Low', 'low', 'low', 'low', [], { aliases: ['green papaya', 'kacha papita'], flags: ['raw-papaya'] }),

  // Sweets
  f('Gulab jamun', 'High', 'high', 'low', 'high', ['milk', 'wheat'], { better: 'fresh fruit' }),
  f('Jalebi', 'High', 'high', 'low', 'high', ['wheat'], { better: 'fresh fruit' }),
  f('Rasgulla', 'High', 'high', 'low', 'low', ['milk'], { aliases: ['rosogolla'], better: 'fresh fruit' }),
  f('Kheer', 'Med', 'high', 'low', 'med', ['milk', 'cashew'], { aliases: ['payasam'], better: 'a few spoons, or fruit with curd' }),
  f('Ladoo', 'High', 'high', 'low', 'high', ['milk', 'cashew'], { aliases: ['laddu', 'besan ladoo', 'motichoor ladoo'], better: 'a few dates or fruit' }),
  f('Halwa', 'High', 'high', 'low', 'high', ['wheat', 'milk', 'cashew'], { aliases: ['sooji halwa', 'gajar halwa'], better: 'fresh fruit' })
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\b(a|an|the|some|plate|bowl|cup|glass|piece|pieces|of)\b/g, ' ').replace(/\s+/g, ' ').trim();
const HARMLESS_WORDS = new Set(['hot', 'cold', 'fresh', 'homemade', 'home', 'made', 'small', 'big', 'large', 'one', 'two', 'plain', 'indian', 'desi', 'some', 'little']);
const singular = (s: string) => s.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

export function findFood(query: string): FoodTags | null {
  const q = norm(query);
  if (!q) return null;
  const names = (food: FoodTags) => [food.name, ...(food.aliases ?? [])].map(norm);

  // 1. exact name/alias (also singular: "2 samosas" → "samosa").
  const exact = FOOD_DB.find((food) => names(food).some((n) => n === q || singular(n) === singular(q)));
  if (exact) return exact;
  // 2. a known name plus only harmless words ("hot samosa", "homemade poha"). Anything else, e.g.
  //    "sabudana khichdi", is a different dish and goes to Gemini instead of a wrong match.
  for (const food of FOOD_DB) {
    for (const n of names(food)) {
      const rest = q.replace(new RegExp(`\\b${n}(s|es)?\\b`), ' ').trim();
      if (rest !== q && rest.split(' ').every((w) => !w || HARMLESS_WORDS.has(w))) return food;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rules (same for built-in and AI-classified foods)
// ---------------------------------------------------------------------------

export interface FoodVerdict {
  verdict: Verdict;
  reason: string;
}

const has = (conditions: string[], re: RegExp) => conditions.find((c) => re.test(c));

export function classifyFood(food: FoodTags, profile: { conditions: string[]; allergies: string[] }): FoodVerdict {
  const { conditions, allergies } = profile;
  const tip = food.better ? ` Try ${food.better} instead.` : '';

  // 🔴 Allergens, or foods unsafe for a condition
  const allergy = findAllergenConflict(food.allergens, allergies);
  // No "better" tip here: healthier versions of a dish usually still contain the allergen.
  if (allergy) {
    return { verdict: 'avoid', reason: `Usually contains ${allergy.term} — you're allergic to ${allergy.allergy}. Skip it, or confirm it's made without ${allergy.term}.` };
  }
  const pregnancy = has(conditions, /pregnan/i);
  if (pregnancy && food.flags?.includes('alcohol')) return { verdict: 'avoid', reason: 'Avoid alcohol completely during pregnancy.' };
  if (pregnancy && food.flags?.includes('raw-papaya')) return { verdict: 'avoid', reason: 'Raw or semi-ripe papaya is best avoided during pregnancy.' };

  // 🟡 Conflicts with conditions
  const issues: string[] = [];
  const diabetes = has(conditions, /diabet|glyc|insulin/i);
  if (diabetes) {
    const why = [food.gi === 'High' && 'high GI', food.sugar === 'high' && 'high in sugar'].filter(Boolean).join(' and ');
    if (why) issues.push(`${why} — not ideal with ${diabetes}`);
  }
  const bp = has(conditions, /hypertension|blood pressure/i);
  if (bp && food.salt === 'high') issues.push(`high in salt — not ideal with ${bp}`);
  const heart = has(conditions, /cholesterol|hyperlipid|dyslipid|coronary|heart|cardiac/i);
  if (heart && food.fat === 'high') issues.push(`high in fat — not ideal with ${heart}`);
  const ckd = has(conditions, /kidney|renal|ckd/i);
  if (ckd && (food.salt === 'high' || food.flags?.includes('high-potassium'))) {
    issues.push(`${food.salt === 'high' ? 'salty' : 'high in potassium'} — limit with ${ckd}`);
  }
  const anaemia = has(conditions, /anaemi|anemi/i);
  if (anaemia && food.flags?.includes('caffeine')) issues.push('reduces iron absorption — have it an hour away from meals (anaemia)');
  if (pregnancy && food.flags?.includes('caffeine')) issues.push('limit caffeine during pregnancy');

  if (issues.length > 0) {
    const text = issues.slice(0, 2).join('; ');
    return { verdict: 'caution', reason: `${text.charAt(0).toUpperCase()}${text.slice(1)}.${tip || ' Keep the portion small.'}` };
  }
  return { verdict: 'clear', reason: 'No conflicts found with your conditions or allergies — portion size still matters.' };
}

// ---------------------------------------------------------------------------
// Gemini fallback for foods not in the list: Gemini only returns tags.
// ---------------------------------------------------------------------------

const LEVEL = { type: 'STRING', enum: ['low', 'med', 'high'] };

const FOOD_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isFood: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    gi: { type: 'STRING', enum: ['Low', 'Med', 'High'] },
    sugar: LEVEL,
    salt: LEVEL,
    fat: LEVEL,
    allergens: { type: 'ARRAY', maxItems: 6, items: { type: 'STRING', enum: [...ALLERGEN_TERMS] } },
    flags: { type: 'ARRAY', maxItems: 4, items: { type: 'STRING', enum: ['caffeine', 'high-potassium', 'raw-papaya', 'alcohol'] } },
    better: { type: 'STRING' }
  },
  required: ['isFood', 'name', 'gi', 'sugar', 'salt', 'fat', 'allergens']
};

export class NotAFoodError extends Error {}

export async function classifyFoodWithGemini(query: string): Promise<FoodTags> {
  const prompt = `Tag this food as typically prepared in India: "${query.slice(0, 80)}".
gi = glycaemic index (Low/Med/High); sugar, salt, fat = low/med/high for a normal serving.
allergens = every allergen commonly present in typical recipes, including garnishes and tempering (e.g. peanuts in sabudana khichdi or poha, cashews in gravies, ghee), only from the allowed list (milk covers ghee/paneer/curd; wheat covers maida/suji; cashew covers tree nuts; prawn covers shellfish). When unsure, include it.
flags: caffeine, high-potassium, raw-papaya, alcohol if they apply. better = one short healthier Indian alternative, or "" if already healthy.
If it is not a food or drink, set isFood=false.`;

  return generateGeminiJson(
    prompt,
    FOOD_SCHEMA,
    (json) => {
      const j = json as Record<string, unknown>;
      if (j.isFood === false) throw new NotAFoodError(query);
      const lvl = (v: unknown): Level => (v === 'low' || v === 'med' || v === 'high' ? v : 'med');
      const allowed = new Set<string>(ALLERGEN_TERMS);
      return {
        name: typeof j.name === 'string' && j.name.trim() ? j.name.trim() : query.trim(),
        gi: j.gi === 'Low' || j.gi === 'High' ? j.gi : 'Med',
        sugar: lvl(j.sugar),
        salt: lvl(j.salt),
        fat: lvl(j.fat),
        allergens: Array.isArray(j.allergens) ? j.allergens.filter((a): a is string => typeof a === 'string' && allowed.has(a)) : [],
        flags: Array.isArray(j.flags) ? (j.flags.filter((x) => ['caffeine', 'high-potassium', 'raw-papaya', 'alcohol'].includes(x as string)) as FoodFlag[]) : [],
        better: typeof j.better === 'string' && j.better.trim() ? j.better.trim() : undefined
      };
    },
    { maxOutputTokens: 250, label: 'FoodCheck' }
  );
}

// ---------------------------------------------------------------------------
// Smart swaps per meal slot (from → to must both be in FOOD_DB)
// ---------------------------------------------------------------------------

export interface SmartSwap {
  from: FoodTags;
  to: FoodTags;
  why: string;
}

const food = (name: string) => FOOD_DB.find((x) => x.name === name)!;

const SWAPS: Record<string, { from: string; to: string; why: string }[]> = {
  Breakfast: [
    { from: 'Sweetened chai', to: 'Unsweetened chai', why: 'Cuts about 2 tsp of sugar per cup' },
    { from: 'White bread', to: 'Multigrain bread', why: 'More fibre, slower sugar release' },
    { from: 'Masala dosa', to: 'Plain dosa', why: 'Skips the potato filling and extra oil' }
  ],
  Lunch: [
    { from: 'White rice', to: 'Brown rice', why: 'Lower GI and more fibre — or use millets' },
    { from: 'Maida roti', to: 'Multigrain roti', why: 'Whole grains instead of refined flour' },
    { from: 'Paneer butter masala', to: 'Palak paneer', why: 'Far less cream, butter and salt' }
  ],
  Snack: [
    { from: 'Samosa', to: 'Roasted chana', why: 'Roasted, not fried — high protein and fibre' },
    { from: 'Namkeen', to: 'Makhana', why: 'Much less salt and fat' },
    { from: 'Sweetened chai', to: 'Unsweetened chai', why: 'Cuts about 2 tsp of sugar per cup' }
  ],
  Dinner: [
    { from: 'White rice', to: 'Millets', why: 'Low GI and rich in fibre and minerals' },
    { from: 'Butter chicken', to: 'Tandoori chicken', why: 'Grilled instead of a cream-and-butter gravy' },
    { from: 'Puri', to: 'Roti', why: 'No deep frying' }
  ]
};

export function smartSwapsFor(mealType: string): SmartSwap[] {
  return (SWAPS[mealType] ?? []).map((s) => ({ from: food(s.from), to: food(s.to), why: s.why }));
}
