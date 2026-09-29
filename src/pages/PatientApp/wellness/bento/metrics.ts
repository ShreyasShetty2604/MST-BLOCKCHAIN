import { useEffect, useRef, useState } from 'react';
import { useIsDark } from '../charts/theme';

// Each dashboard metric owns one vivid colour (teal stays reserved for buttons; red / amber /
// green only for status). Validated with the dataviz palette checker:
//  - dark rings  #FF7A59 / #D4F53C / #38BDF8: adjacent CVD ΔE ≥ 18, all ≥ 3:1 on the card.
//  - light rings #F7765E / #3F6F0A / #0891D1: adjacent CVD ΔE ≥ 13 (lime is stepped dark so it
//    doesn't collapse into coral for red-green colour blindness); coral is 2.7:1, so every ring
//    also carries a visible label and value.
// `text` is the same hue stepped for ≥ 4.5:1 text contrast where the ring colour is too light.

export type MetricId = 'eaten' | 'burned' | 'water' | 'carbs' | 'steps';

export interface MetricColor {
  ring: string;
  text: string;
  track: string;
}

const DARK: Record<MetricId, MetricColor> = {
  eaten: { ring: '#FF7A59', text: '#FF7A59', track: 'rgba(255, 122, 89, 0.18)' },
  burned: { ring: '#D4F53C', text: '#D4F53C', track: 'rgba(212, 245, 60, 0.16)' },
  water: { ring: '#38BDF8', text: '#38BDF8', track: 'rgba(56, 189, 248, 0.18)' },
  carbs: { ring: '#A78BFA', text: '#A78BFA', track: 'rgba(167, 139, 250, 0.18)' },
  steps: { ring: '#D4F53C', text: '#D4F53C', track: 'rgba(212, 245, 60, 0.16)' }
};

const LIGHT: Record<MetricId, MetricColor> = {
  eaten: { ring: '#F7765E', text: '#C2412B', track: 'rgba(247, 118, 94, 0.16)' },
  burned: { ring: '#3F6F0A', text: '#3F6F0A', track: 'rgba(63, 111, 10, 0.13)' },
  water: { ring: '#0891D1', text: '#0369A1', track: 'rgba(8, 145, 209, 0.14)' },
  carbs: { ring: '#7C3AED', text: '#6D28D9', track: 'rgba(124, 58, 237, 0.12)' },
  steps: { ring: '#3F6F0A', text: '#3F6F0A', track: 'rgba(63, 111, 10, 0.13)' }
};

export function useMetricColors(): Record<MetricId, MetricColor> {
  return useIsDark() ? DARK : LIGHT;
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// Smooth count-up: eases from the previous value to the new one (from 0 on first render).
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const current = useRef(value);
  useEffect(() => {
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3));
      current.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

// Activity → kcal with standard MET values (Compendium of Physical Activities).
export type ActivityKind = 'walk' | 'yoga' | 'cycling';
export const ACTIVITY_MET: Record<ActivityKind, { label: string; met: number }> = {
  walk: { label: 'Walk', met: 3.5 },
  yoga: { label: 'Yoga', met: 2.5 },
  cycling: { label: 'Cycling', met: 6.8 }
};
export const STEPS_PER_WALK_MINUTE = 100;

export function activityKcal(kind: ActivityKind, minutes: number, weightKg: number): number {
  return Math.round(ACTIVITY_MET[kind].met * weightKg * (minutes / 60));
}

// Walking burns roughly 0.00055 kcal per step per kg of body weight (~0.04 kcal/step at 74 kg).
export const stepKcal = (steps: number, weightKg: number) => Math.round(steps * 0.00055 * weightKg);

export const GOALS = { burnedKcal: 450, water: 8, steps: 8000 };
