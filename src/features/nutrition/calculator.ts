// All nutrition numbers are computed here, in code. Nothing downstream (UI or a future LLM)
// should invent calorie values.

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';

export const ACTIVITY_LEVELS: Record<ActivityLevel, { label: string; multiplier: number }> = {
  sedentary: { label: 'Sedentary (little or no exercise)', multiplier: 1.2 },
  light: { label: 'Light (exercise 1-3 days/week)', multiplier: 1.375 },
  moderate: { label: 'Moderate (exercise 3-5 days/week)', multiplier: 1.55 },
  active: { label: 'Active (exercise 6-7 days/week)', multiplier: 1.725 },
  'very-active': { label: 'Very active (physical job or twice-daily training)', multiplier: 1.9 }
};

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

// Asia-Pacific cut-offs (WHO 2004 / Indian consensus guidelines), lower than the global 25/30.
export const ASIAN_BMI_CUTOFFS: { category: BmiCategory; label: string; min: number }[] = [
  { category: 'obese', label: 'Obese', min: 25 },
  { category: 'overweight', label: 'Overweight', min: 23 },
  { category: 'normal', label: 'Normal', min: 18.5 },
  { category: 'underweight', label: 'Underweight', min: 0 }
];

// Safety floor so a weight-loss deficit never drops intake too low without supervision.
export const MIN_DAILY_CALORIES: Record<Sex, number> = { male: 1500, female: 1200 };

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM), 1);
}

export function classifyBmiAsian(bmi: number): { category: BmiCategory; label: string } {
  const band = ASIAN_BMI_CUTOFFS.find((b) => bmi >= b.min) ?? ASIAN_BMI_CUTOFFS[ASIAN_BMI_CUTOFFS.length - 1];
  return { category: band.category, label: band.label };
}

// Mifflin-St Jeor basal metabolic rate, in kcal/day.
export function calculateBmr(sex: Sex, weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// Total daily energy expenditure: BMR scaled by activity level.
export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_LEVELS[activity].multiplier);
}

// Applies a rule-driven adjustment (e.g. a weight-loss deficit) and clamps to the safety floor.
export function calculateCalorieTarget(tdee: number, adjustment: number, sex: Sex): number {
  const target = Math.max(tdee + adjustment, MIN_DAILY_CALORIES[sex]);
  return Math.round(target / 10) * 10;
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
