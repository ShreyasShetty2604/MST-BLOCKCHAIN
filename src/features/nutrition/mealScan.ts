// Meal photo scan. The AI only *describes* the plate (dishes + ingredients); every safety
// verdict is decided here, in code, against the patient's vault profile.

export interface ScannedDish {
  name: string;
  confidence: number; // 0-1
  visibleIngredients: string[];
  hiddenIngredients: string[]; // likely present but not visible (common in Indian cooking)
  // Packaged foods / drinks, read from the label
  packaged?: boolean;
  brand?: string;
  labelText?: string;
  sweeteners?: string[];
  caffeine?: boolean;
  sodium?: string; // e.g. "high", "low", "45 mg per 100 ml", "unknown"
}

export interface NutritionEstimate {
  carbsG: number;
  proteinG: number;
  fatG: number;
  sugarG: number;
  sodiumMg: number;
}

export interface MealAnalysis {
  noFood?: boolean;
  nutrition?: NutritionEstimate; // whole-meal estimate, when Gemini provides one
  dishes: ScannedDish[];
}

export type Verdict = 'avoid' | 'caution' | 'clear';

export interface DishVerdict {
  dish: ScannedDish;
  verdict: Verdict;
  reason: string;
  suggestion?: string;
}

export interface MealVerdict {
  overall: Verdict;
  dishes: DishVerdict[];
}

export interface DietProfile {
  allergies: string[];
  conditions: string[];
}

// ---------------------------------------------------------------------------
// Gemini (native generateContent endpoint; key goes in the x-goog-api-key header,
// which works for both classic "AIza…" and new "AQ.…" keys)
// ---------------------------------------------------------------------------

// Fastest first: Flash-Lite models, then Flash only if those error or time out.
const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest'
];

// Lowest thinking level first; some models reject "minimal", so step up only if needed.
const THINKING_LEVELS = ['minimal', 'low'] as const;
type ThinkingLevel = (typeof THINKING_LEVELS)[number] | 'none';

const ATTEMPT_TIMEOUT_MS = 8_000; // a slow model is treated like a failing one (except the last resort)
const FAILURE_COOLDOWN_MS = 5 * 60_000;
const MAX_IMAGE_SIDE = 768;
const JPEG_QUALITY = 0.7;
const MAX_INLINE_BYTES = 15 * 1024 * 1024; // Gemini inline request limit is ~20 MB
const RETRY_DELAYS_MS = [500, 1000]; // up to 2 automatic retries for network errors / rate limits
const RETRYABLE_FAILURES: GeminiFailure[] = ['network', 'rate-limit'];

const STORAGE = {
  lastGoodModel: 'medivault_gemini_model'
};

// Every photo is analysed fresh. Remove results cached by an earlier version of this feature.
try {
  localStorage.removeItem('medivault_meal_scan_cache');
} catch {
  /* storage unavailable */
}

export type GeminiFailure = 'invalid-key' | 'model-not-found' | 'image-too-large' | 'rate-limit' | 'unavailable' | 'timeout' | 'bad-response' | 'network';

export const GEMINI_FAILURE_MESSAGES: Record<GeminiFailure, string> = {
  'invalid-key': 'Invalid API key',
  'model-not-found': 'Model not found',
  'image-too-large': 'Image too large',
  'rate-limit': 'Rate limit reached — try again in a minute',
  unavailable: 'Gemini is busy right now — try again shortly',
  timeout: 'Gemini took too long to respond — try again',
  'bad-response': 'Unexpected response from Gemini',
  network: 'Network error — check your connection'
};

// Errors worth retrying on a different model.
const MODEL_SPECIFIC_FAILURES: GeminiFailure[] = ['model-not-found', 'unavailable', 'rate-limit', 'timeout', 'bad-response'];

export class GeminiError extends Error {
  constructor(public reason: GeminiFailure, public detail?: unknown) {
    super(GEMINI_FAILURE_MESSAGES[reason]);
    this.name = 'GeminiError';
  }
}

export type ScanStep = 'reading' | 'identifying' | 'checking';

const PROMPT = `Identify each food, dish or drink in this photo (Indian cuisine likely). Max 5 items, max 6 ingredients per list, lowercase ingredient names, no descriptions.
hidden = likely unseen ingredients typical of Indian cooking (peanuts/coconut in chutney, cashew/cream in gravy, ghee, sugar, jaggery, maida, besan, curd, sesame).
Packaged items: packaged=true, read brand and short label text (e.g. "no sugar"), list sweeteners, caffeine, sodium (high/moderate/low/unknown).
nutrition = rough total for the whole plate (carbs_g, protein_g, fat_g, sugar_g, sodium_mg).
No food: {"noFood":true,"dishes":[]}.`;

const list = (max: number) => ({ type: 'ARRAY', maxItems: max, items: { type: 'STRING' } });

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    noFood: { type: 'BOOLEAN' },
    dishes: {
      type: 'ARRAY',
      maxItems: 5,
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
          visible: list(6),
          hidden: list(6),
          packaged: { type: 'BOOLEAN' },
          brand: { type: 'STRING' },
          label: { type: 'STRING' },
          sweeteners: list(4),
          caffeine: { type: 'BOOLEAN' },
          sodium: { type: 'STRING', enum: ['high', 'moderate', 'low', 'unknown'] }
        },
        required: ['name', 'confidence', 'visible', 'hidden']
      }
    },
    nutrition: {
      type: 'OBJECT',
      properties: {
        carbs_g: { type: 'NUMBER' },
        protein_g: { type: 'NUMBER' },
        fat_g: { type: 'NUMBER' },
        sugar_g: { type: 'NUMBER' },
        sodium_mg: { type: 'NUMBER' }
      }
    }
  },
  required: ['noFood', 'dishes']
};

export function hasGeminiKey(): boolean {
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}

// --- model memory ---------------------------------------------------------

interface ModelChoice {
  model: string;
  thinking: ThinkingLevel;
}

const cooldownUntil = new Map<string, number>(); // model -> timestamp, in-memory for this session

function loadLastGood(): ModelChoice | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.lastGoodModel) || 'null');
  } catch {
    return null;
  }
}

function saveLastGood(choice: ModelChoice) {
  try {
    localStorage.setItem(STORAGE.lastGoodModel, JSON.stringify(choice));
  } catch {
    /* storage unavailable: just don't remember */
  }
}

// Remembered winner first, then healthy models, then models that recently failed.
function modelOrder(): ModelChoice[] {
  const lastGood = loadLastGood();
  const configured = import.meta.env.VITE_GEMINI_MODEL?.trim();
  const names = [...new Set([configured, lastGood?.model, ...DEFAULT_MODELS].filter((m): m is string => Boolean(m)))];
  const now = Date.now();
  const healthy = names.filter((m) => (cooldownUntil.get(m) ?? 0) <= now);
  const cooling = names.filter((m) => (cooldownUntil.get(m) ?? 0) > now);
  return [...healthy, ...cooling].map((model) => ({
    model,
    thinking: lastGood?.model === model ? lastGood.thinking : THINKING_LEVELS[0]
  }));
}

// --- main entry ------------------------------------------------------------

export async function analyseMealPhoto(file: File, onStep?: (step: ScanStep) => void): Promise<MealAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError('invalid-key');

  const started = performance.now();
  onStep?.('reading');

  const { base64, mimeType } = await prepareImage(file);
  if (base64.length * 0.75 > MAX_INLINE_BYTES) throw new GeminiError('image-too-large');
  const prepMs = Math.round(performance.now() - started);

  onStep?.('identifying');
  const candidates = modelOrder();
  let lastError: GeminiError | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const { model } = candidates[i];
    const isLastResort = i === candidates.length - 1;
    const remembered = candidates[i].thinking;
    const levels: ThinkingLevel[] =
      remembered === 'none' ? ['none'] : [...THINKING_LEVELS.slice(THINKING_LEVELS.indexOf(remembered)), 'none'];

    levelLoop: for (const thinking of levels) {
      for (let attempt = 0; ; attempt++) {
        const t = performance.now();
        try {
          const analysis = await callModel(model, thinking, apiKey, base64, mimeType, isLastResort ? undefined : ATTEMPT_TIMEOUT_MS);
          const apiMs = Math.round(performance.now() - t);
          console.info(
            `[MealScan] ${model} (thinking: ${thinking}) — total ${Math.round(performance.now() - started)} ms ` +
              `(image prep ${prepMs} ms, Gemini ${apiMs} ms, ${i} model fallback${i === 1 ? '' : 's'}, ${attempt} retr${attempt === 1 ? 'y' : 'ies'})`
          );
          saveLastGood({ model, thinking });
          cooldownUntil.delete(model);
          return analysis;
        } catch (err) {
          lastError = err instanceof GeminiError ? err : new GeminiError('bad-response', err);
          console.warn(`[MealScan] ${model} (thinking: ${thinking}) failed after ${Math.round(performance.now() - t)} ms: ${lastError.reason}`);

          // Network blips and rate limits: short wait, then retry the same request (max 2 times).
          if (RETRYABLE_FAILURES.includes(lastError.reason) && attempt < RETRY_DELAYS_MS.length) {
            console.info(`[MealScan] retrying ${model} in ${RETRY_DELAYS_MS[attempt]} ms (retry ${attempt + 1}/${RETRY_DELAYS_MS.length})`);
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
            continue;
          }
          // Model rejected this thinking level: try the same model with the next level.
          if (lastError.reason === 'bad-response' && /thinking/i.test(JSON.stringify(lastError.detail ?? ''))) continue levelLoop;
          break levelLoop;
        }
      }
    }

    if (!MODEL_SPECIFIC_FAILURES.includes(lastError!.reason)) break; // e.g. bad key: no point trying others
    cooldownUntil.set(model, Date.now() + FAILURE_COOLDOWN_MS);
  }
  console.error(`[MealScan] all models failed after ${Math.round(performance.now() - started)} ms`);
  throw lastError ?? new GeminiError('model-not-found');
}

async function callModel(
  model: string,
  thinking: ThinkingLevel,
  apiKey: string,
  base64: string,
  mimeType: string,
  timeoutMs?: number
): Promise<MealAnalysis> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 700,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          ...(thinking === 'none' ? {} : { thinkingConfig: { thinkingLevel: thinking } })
        }
      })
    });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) throw new GeminiError('timeout');
    console.error(`[MealScan] Network error calling ${model}`, err);
    throw new GeminiError('network', err);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err) {
    throw new GeminiError(controller.signal.aborted ? 'timeout' : 'bad-response', err);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.error(`[MealScan] Gemini ${model} error ${res.status}`, data);
    throw new GeminiError(classifyError(res.status, data?.error), data?.error);
  }

  // Gemini 3 models may return "thought" parts before the answer; use the answer text only.
  const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
  if (!text) {
    console.error(`[MealScan] Gemini ${model} returned no text`, data);
    throw new GeminiError('bad-response', data);
  }

  try {
    return parseAnalysis(text);
  } catch (err) {
    console.error(`[MealScan] Could not parse Gemini JSON from ${model} (finish: ${data?.candidates?.[0]?.finishReason})`, text, err);
    throw new GeminiError('bad-response', text);
  }
}

function classifyError(status: number, error?: { message?: string; status?: string; details?: { reason?: string }[] }): GeminiFailure {
  const msg = `${error?.message ?? ''} ${error?.status ?? ''} ${JSON.stringify(error?.details ?? '')}`.toLowerCase();
  if (status === 401 || status === 403 || /api[_ ]?key|unauthenticated|permission_denied/.test(msg)) return 'invalid-key';
  if (status === 429 || /resource_exhausted|quota|rate limit/.test(msg)) return 'rate-limit';
  if (status === 413 || /too large|payload size|request size/.test(msg)) return 'image-too-large';
  if (status === 404 || /not found|no longer available/.test(msg)) return 'model-not-found';
  if (status >= 500) return 'unavailable';
  return 'bad-response';
}

function parseAnalysis(text: string): MealAnalysis {
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  const rawDishes: unknown[] = Array.isArray(json?.dishes) ? json.dishes : [];
  const strings = (v: unknown, max: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').slice(0, max) : [];
  const optString = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

  const dishes = rawDishes
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .slice(0, 5)
    .map((d) => ({
      name: optString(d.name) ?? 'Unknown item',
      confidence: typeof d.confidence === 'number' ? Math.min(Math.max(d.confidence, 0), 1) : 0.5,
      visibleIngredients: strings(d.visible, 6),
      hiddenIngredients: strings(d.hidden, 6),
      packaged: d.packaged === true,
      brand: optString(d.brand),
      labelText: optString(d.label),
      sweeteners: strings(d.sweeteners, 4),
      caffeine: d.caffeine === true,
      sodium: optString(d.sodium)
    }));

  const n = json?.nutrition;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);
  const parts = n ? [num(n.carbs_g), num(n.protein_g), num(n.fat_g), num(n.sugar_g), num(n.sodium_mg)] : [];
  const nutrition =
    parts.length === 5 && parts.every((v) => v !== null)
      ? { carbsG: parts[0]!, proteinG: parts[1]!, fatG: parts[2]!, sugarG: parts[3]!, sodiumMg: parts[4]! }
      : undefined;

  return { noFood: json?.noFood === true || dishes.length === 0, dishes, nutrition };
}

// Downscale to max 768px and re-encode as ~70% JPEG; falls back to the original file if the
// browser can't decode it (e.g. HEIC on some desktops).
async function prepareImage(file: File): Promise<{ base64: string; mimeType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg' };
  }
}

// Label facts (sweeteners, caffeine, sodium) as matchable ingredient terms for the rules engine.
function labelTerms(dish: ScannedDish): string[] {
  const terms = [...(dish.sweeteners ?? [])];
  if (dish.caffeine) terms.push('caffeine');
  if (dish.sodium && /high/i.test(dish.sodium)) terms.push('high sodium');
  return terms;
}

// ---------------------------------------------------------------------------
// Rules engine (deterministic)
// ---------------------------------------------------------------------------

// Allergy groups: any profile allergy that matches a group trigger expands to all its food terms.
const ALLERGEN_GROUPS: { label: string; triggers: string[]; terms: string[] }[] = [
  {
    label: 'Peanut',
    triggers: ['peanut', 'groundnut'],
    terms: ['peanut', 'groundnut', 'moongphali', 'mungfali', 'shengdana', 'singdana']
  },
  {
    label: 'Tree nut',
    triggers: ['tree nut', 'nut', 'cashew', 'almond', 'pistachio', 'walnut'],
    terms: ['cashew', 'kaju', 'almond', 'badam', 'pistachio', 'pista', 'walnut', 'akhrot', 'hazelnut', 'chironji']
  },
  {
    label: 'Dairy',
    triggers: ['milk', 'dairy', 'lactose', 'casein'],
    terms: ['milk', 'ghee', 'butter', 'paneer', 'curd', 'dahi', 'yogurt', 'yoghurt', 'cream', 'malai', 'khoa', 'khoya', 'mawa', 'cheese', 'buttermilk', 'chaas', 'raita', 'condensed milk', 'milk powder']
  },
  {
    label: 'Gluten',
    triggers: ['gluten', 'wheat', 'celiac', 'coeliac'],
    terms: ['wheat', 'maida', 'atta', 'suji', 'sooji', 'semolina', 'rava', 'rawa', 'dalia', 'barley', 'bread', 'roti', 'chapati', 'naan', 'paratha', 'puri', 'poori', 'kulcha', 'bhatura']
  },
  { label: 'Egg', triggers: ['egg'], terms: ['egg', 'anda', 'mayonnaise', 'omelette'] },
  { label: 'Fish', triggers: ['fish'], terms: ['fish', 'machli', 'machhi', 'pomfret', 'surmai', 'rohu', 'hilsa', 'anchovy', 'tuna', 'salmon'] },
  {
    label: 'Shellfish',
    triggers: ['shellfish', 'crustacean', 'prawn', 'shrimp', 'crab', 'lobster'],
    terms: ['prawn', 'shrimp', 'jhinga', 'crab', 'lobster', 'shellfish', 'clam', 'mussel', 'oyster']
  },
  { label: 'Soy', triggers: ['soy', 'soya'], terms: ['soy', 'soya', 'tofu', 'soy sauce', 'soya chunks'] },
  { label: 'Sesame', triggers: ['sesame', 'til', 'gingelly'], terms: ['sesame', 'til', 'gingelly', 'tahini'] },
  { label: 'Mustard', triggers: ['mustard'], terms: ['mustard', 'rai', 'sarson', 'kasundi'] },
  { label: 'Coconut', triggers: ['coconut'], terms: ['coconut', 'nariyal', 'copra'] }
];

// Condition rules: food terms that conflict with a condition, plus what to do instead.
const CONDITION_RULES: { label: string; triggers: string[]; terms: string[]; suggestion: string }[] = [
  {
    label: 'Diabetes',
    triggers: ['diabet', 'prediabet', 'insulin resistance', 'hyperglyc'],
    terms: ['sugar', 'jaggery', 'gur', 'honey', 'syrup', 'sugar syrup', 'condensed milk', 'khoa', 'khoya', 'mawa', 'maida', 'gulab jamun', 'jalebi', 'rasgulla', 'rasmalai', 'ladoo', 'laddu', 'barfi', 'halwa', 'kheer', 'payasam', 'mithai', 'sweet', 'dessert', 'cake', 'ice cream', 'soft drink', 'white bread'],
    suggestion: 'Have a small portion (1 piece / a few spoons) after a protein-rich meal, or swap for fresh fruit or a sugar-free version.'
  },
  {
    label: 'Hypertension',
    triggers: ['hypertension', 'blood pressure', 'bp'],
    terms: ['high sodium', 'pickle', 'achar', 'papad', 'namkeen', 'salted', 'soy sauce', 'bhujia', 'chips', 'processed cheese', 'instant noodles', 'caffeine'],
    suggestion: 'Keep salty or caffeinated items to a small portion — skip the pickle/papad, choose low-sodium or caffeine-free versions.'
  },
  {
    label: 'High cholesterol / heart disease',
    triggers: ['hyperlipid', 'cholesterol', 'coronary', 'heart', 'cardiac', 'dyslipid'],
    terms: ['ghee', 'butter', 'cream', 'malai', 'vanaspati', 'dalda', 'deep fried', 'fried', 'pakora', 'samosa', 'puri', 'poori', 'bhatura', 'khoa', 'khoya'],
    suggestion: 'Ask for less ghee/butter, skip the cream, and prefer tandoori or steamed options over fried.'
  },
  {
    label: 'Pregnancy',
    triggers: ['pregnan'],
    terms: ['raw papaya', 'papaya', 'alcohol', 'beer', 'wine', 'raw egg', 'unpasteurised', 'unpasteurized', 'shark', 'swordfish', 'king mackerel', 'caffeine'],
    suggestion: 'Skip this item or check with your obstetrician — choose well-cooked, pasteurised and caffeine-free options.'
  },
  {
    label: 'Anaemia',
    triggers: ['anaemi', 'anemi'],
    terms: ['tea', 'coffee', 'chai'],
    suggestion: 'Have tea or coffee at least an hour away from meals — it reduces iron absorption.'
  },
  {
    label: 'Phenylketonuria',
    triggers: ['phenylketon', 'pku'],
    terms: ['aspartame'],
    suggestion: 'Choose a drink sweetened with stevia or sucralose instead — aspartame contains phenylalanine.'
  },
  {
    label: 'Kidney disease',
    triggers: ['kidney', 'renal', 'ckd'],
    terms: ['pickle', 'achar', 'papad', 'salt', 'banana', 'tomato', 'potato', 'coconut water'],
    suggestion: 'Keep the portion small and check this food against your renal diet chart.'
  }
];

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Word-boundary match (optionally plural) so "egg" doesn't hit "eggplant".
function containsTerm(text: string, term: string): boolean {
  const escaped = normalise(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(s|es)?\\b`).test(normalise(text));
}

interface AllergenCheck {
  allergy: string; // as written in the profile
  terms: string[];
}

function buildAllergenChecks(allergies: string[]): AllergenCheck[] {
  return allergies.map((allergy) => {
    const group = ALLERGEN_GROUPS.find((g) => g.triggers.some((t) => containsTerm(allergy, t)));
    // Unknown allergy (e.g. "Penicillin") → still match the literal word, harmless for drugs.
    return { allergy, terms: group ? group.terms : [normalise(allergy)] };
  });
}

function findTerm(sources: string[], terms: string[]): { term: string; source: string } | null {
  for (const source of sources) {
    const term = terms.find((t) => containsTerm(source, t));
    if (term) return { term, source };
  }
  return null;
}

export function evaluateMeal(analysis: MealAnalysis, profile: DietProfile): MealVerdict {
  const allergenChecks = buildAllergenChecks(profile.allergies);
  const conditionRules = CONDITION_RULES.filter((r) =>
    profile.conditions.some((c) => r.triggers.some((t) => normalise(c).includes(t)))
  );

  const dishes = analysis.dishes.map((dish): DishVerdict => {
    // Ingredients first so reasons name the ingredient; the dish name is a final catch-all.
    const visible = [...dish.visibleIngredients, ...labelTerms(dish), dish.name];
    const hidden = dish.hiddenIngredients;

    // 1. Allergens — visible or likely hidden both mean Avoid.
    for (const check of allergenChecks) {
      const seen = findTerm(visible, check.terms);
      const hit = seen ?? findTerm(hidden, check.terms);
      if (hit) {
        return {
          dish,
          verdict: 'avoid',
          reason: `${seen ? 'Contains' : 'Likely made with'} ${describeHit(hit)} in ${dish.name} — you're allergic to ${check.allergy}.`
        };
      }
    }

    // 2. Condition conflicts → Caution.
    for (const rule of conditionRules) {
      const hit = findTerm([...visible, ...hidden], rule.terms);
      if (hit) {
        const condition = profile.conditions.find((c) => rule.triggers.some((t) => normalise(c).includes(t)));
        return {
          dish,
          verdict: 'caution',
          reason: `${capitalise(describeHit(hit))} — not ideal with ${condition ?? rule.label}.`,
          suggestion: rule.suggestion
        };
      }
    }

    return {
      dish,
      verdict: 'clear',
      reason:
        dish.confidence < 0.5
          ? 'No visible allergens detected, but the dish was hard to identify.'
          : 'No visible allergens detected for your profile.'
    };
  });

  const overall: Verdict = dishes.some((d) => d.verdict === 'avoid')
    ? 'avoid'
    : dishes.some((d) => d.verdict === 'caution')
    ? 'caution'
    : 'clear';

  return { overall, dishes };
}

function describeHit(hit: { term: string; source: string }): string {
  const source = hit.source.toLowerCase();
  const same = [hit.term, `${hit.term}s`, `${hit.term}es`].some((t) => normalise(t) === normalise(source));
  return same ? hit.term : `${hit.term} (${source})`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Demo presets — used when the API is unavailable so the demo never breaks.
// Each preset declares the profile items it needs to show its intended verdict; these are
// merged with the real profile and labelled as demo assumptions in the UI.
// ---------------------------------------------------------------------------

export interface DemoMeal {
  id: string;
  label: string;
  emoji: string;
  demoProfile: DietProfile;
  analysis: MealAnalysis;
}

export const DEMO_MEALS: DemoMeal[] = [
  {
    id: 'dosa-peanut',
    label: 'Dosa + peanut chutney',
    emoji: '🥞',
    demoProfile: { allergies: ['Peanuts'], conditions: [] },
    analysis: {
      dishes: [
        {
          name: 'Plain dosa',
          confidence: 0.93,
          visibleIngredients: ['rice batter', 'urad dal'],
          hiddenIngredients: ['oil', 'fenugreek seeds']
        },
        {
          name: 'Peanut chutney',
          confidence: 0.81,
          visibleIngredients: ['peanuts', 'curry leaves', 'mustard seeds'],
          hiddenIngredients: ['green chilli', 'tamarind', 'oil']
        },
        {
          name: 'Sambar',
          confidence: 0.88,
          visibleIngredients: ['toor dal', 'drumstick', 'tomato'],
          hiddenIngredients: ['tamarind', 'jaggery', 'asafoetida']
        }
      ],
      nutrition: { carbsG: 68, proteinG: 16, fatG: 22, sugarG: 7, sodiumMg: 820 }
    }
  },
  {
    id: 'gulab-jamun',
    label: 'Gulab jamun',
    emoji: '🍮',
    demoProfile: { allergies: [], conditions: ['Type 2 Diabetes Mellitus'] },
    analysis: {
      dishes: [
        {
          name: 'Gulab jamun',
          confidence: 0.95,
          visibleIngredients: ['sugar syrup', 'fried khoa dumplings'],
          hiddenIngredients: ['maida', 'ghee', 'cardamom', 'rose water']
        }
      ],
      nutrition: { carbsG: 48, proteinG: 4, fatG: 14, sugarG: 38, sodiumMg: 60 }
    }
  },
  {
    id: 'dal-roti-salad',
    label: 'Dal + roti + salad',
    emoji: '🥗',
    demoProfile: { allergies: [], conditions: [] },
    analysis: {
      dishes: [
        {
          name: 'Moong dal',
          confidence: 0.9,
          visibleIngredients: ['moong dal', 'tomato', 'coriander'],
          hiddenIngredients: ['turmeric', 'cumin', 'garlic']
        },
        {
          name: 'Phulka roti',
          confidence: 0.94,
          visibleIngredients: ['whole wheat roti'],
          hiddenIngredients: []
        },
        {
          name: 'Cucumber onion salad',
          confidence: 0.92,
          visibleIngredients: ['cucumber', 'onion', 'lemon'],
          hiddenIngredients: []
        }
      ],
      nutrition: { carbsG: 58, proteinG: 18, fatG: 9, sugarG: 5, sodiumMg: 540 }
    }
  }
];

export function mergeProfiles(a: DietProfile, b: DietProfile): DietProfile {
  const uniq = (xs: string[]) => Array.from(new Map(xs.map((x) => [normalise(x), x])).values());
  return {
    allergies: uniq([...a.allergies, ...b.allergies]),
    conditions: uniq([...a.conditions, ...b.conditions])
  };
}

// Demo assumptions not already covered by the patient's real profile.
export function demoOnlyItems(real: DietProfile, demo: DietProfile): string[] {
  const has = (list: string[], x: string) => list.some((y) => normalise(y) === normalise(x));
  return [
    ...demo.allergies.filter((a) => !has(real.allergies, a)).map((a) => `${a} allergy`),
    ...demo.conditions.filter((c) => !has(real.conditions, c))
  ];
}

// ---------------------------------------------------------------------------
// Shared helpers for other food tools (text-only Gemini JSON, allergen lookup).
// They reuse the photo scan's model memory, fallback order, retries and timeouts.
// ---------------------------------------------------------------------------

export async function generateGeminiJson<T>(
  prompt: string,
  schema: object,
  parse: (json: unknown) => T,
  { maxOutputTokens = 300, label = 'Gemini' }: { maxOutputTokens?: number; label?: string } = {}
): Promise<T> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiError('invalid-key');

  const started = performance.now();
  const candidates = modelOrder();
  let lastError: GeminiError | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const { model } = candidates[i];
    const timeoutMs = i === candidates.length - 1 ? undefined : ATTEMPT_TIMEOUT_MS;
    const remembered = candidates[i].thinking;
    const levels: ThinkingLevel[] =
      remembered === 'none' ? ['none'] : [...THINKING_LEVELS.slice(THINKING_LEVELS.indexOf(remembered)), 'none'];

    levelLoop: for (const thinking of levels) {
      for (let attempt = 0; ; attempt++) {
        let json: unknown;
        try {
          const text = await callTextModel(model, thinking, apiKey, prompt, schema, maxOutputTokens, timeoutMs);
          try {
            json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
          } catch {
            throw new GeminiError('bad-response', text);
          }
        } catch (err) {
          lastError = err instanceof GeminiError ? err : new GeminiError('bad-response', err);
          console.warn(`[${label}] ${model} (thinking: ${thinking}) failed: ${lastError.reason}`, lastError.detail ?? '');
          if (RETRYABLE_FAILURES.includes(lastError.reason) && attempt < RETRY_DELAYS_MS.length) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
            continue;
          }
          if (lastError.reason === 'bad-response' && /thinking/i.test(JSON.stringify(lastError.detail ?? ''))) continue levelLoop;
          break levelLoop;
        }
        // The model answered. parse() errors (e.g. "not a food") are real answers: let them reach the caller.
        console.info(`[${label}] ${model} (thinking: ${thinking}) — ${Math.round(performance.now() - started)} ms`);
        saveLastGood({ model, thinking });
        cooldownUntil.delete(model);
        return parse(json);
      }
    }

    if (!MODEL_SPECIFIC_FAILURES.includes(lastError!.reason)) break;
    cooldownUntil.set(model, Date.now() + FAILURE_COOLDOWN_MS);
  }
  console.error(`[${label}] all models failed after ${Math.round(performance.now() - started)} ms`);
  throw lastError ?? new GeminiError('model-not-found');
}

async function callTextModel(
  model: string,
  thinking: ThinkingLevel,
  apiKey: string,
  prompt: string,
  schema: object,
  maxOutputTokens: number,
  timeoutMs?: number
): Promise<string> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens,
            responseMimeType: 'application/json',
            responseSchema: schema,
            ...(thinking === 'none' ? {} : { thinkingConfig: { thinkingLevel: thinking } })
          }
        })
      });
    } catch (err) {
      throw new GeminiError(controller.signal.aborted ? 'timeout' : 'network', err);
    }
    const data: any = await res.json().catch(() => null);
    if (!res.ok) throw new GeminiError(classifyError(res.status, data?.error), data?.error);
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    if (!text) throw new GeminiError('bad-response', data);
    return text;
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError(controller.signal.aborted ? 'timeout' : 'bad-response', err);
  } finally {
    clearTimeout(timer);
  }
}

// Which of the patient's allergies (if any) a list of ingredient/allergen terms hits.
export function findAllergenConflict(terms: string[], allergies: string[]): { allergy: string; term: string } | null {
  for (const check of buildAllergenChecks(allergies)) {
    const hit = findTerm(terms, check.terms);
    if (hit) return { allergy: check.allergy, term: hit.term };
  }
  return null;
}
