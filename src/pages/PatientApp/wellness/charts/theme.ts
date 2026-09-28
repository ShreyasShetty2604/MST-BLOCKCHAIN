import { useEffect, useState } from 'react';

// Chart colours for the Wellness page: one teal accent plus neutral greys; red / amber / green
// only for status. Light and dark each select their own steps (validated with the dataviz
// palette checker: adjacent CVD ΔE ≥ 18 in both modes; grey/deep-teal "chroma" is relieved by
// always pairing each macro with a legend entry and a direct label).

export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => setDark(el.classList.contains('dark')));
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

export interface ChartTokens {
  accent: string;
  accentWash: string;
  track: string;
  grid: string;
  axis: string;
  ink: string;
  muted: string;
  surface: string;
  macro: Record<'Carbs' | 'Protein' | 'Fat', string>;
  status: { good: string; warn: string; bad: string; goodWash: string };
}

export function chartTokens(dark: boolean): ChartTokens {
  return dark
    ? {
        accent: '#2DD4BF',
        accentWash: 'rgba(45, 212, 191, 0.12)',
        track: '#1E293B',
        grid: '#1E293B',
        axis: '#64748B',
        ink: '#F1F5F9',
        muted: '#94A3B8',
        surface: '#0F172A',
        macro: { Carbs: '#2DD4BF', Protein: '#0F766E', Fat: '#94A3B8' },
        status: { good: '#34D399', warn: '#FBBF24', bad: '#FB7185', goodWash: 'rgba(52, 211, 153, 0.10)' }
      }
    : {
        accent: '#0F766E',
        accentWash: 'rgba(15, 118, 110, 0.10)',
        track: '#F1F5F9',
        grid: '#E2E8F0',
        axis: '#94A3B8',
        ink: '#0F172A',
        muted: '#64748B',
        surface: '#FFFFFF',
        macro: { Carbs: '#115E59', Protein: '#14B8A6', Fat: '#94A3B8' },
        status: { good: '#10B981', warn: '#F59E0B', bad: '#F43F5E', goodWash: 'rgba(16, 185, 129, 0.08)' }
      };
}

export function useChartTokens(): ChartTokens {
  return chartTokens(useIsDark());
}

// Polar helpers for SVG rings/arcs. Angles in degrees, 0° = 3 o'clock, counter-clockwise positive.
export function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

export function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const a = polar(cx, cy, r, fromDeg);
  const b = polar(cx, cy, r, toDeg);
  const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  const sweep = toDeg < fromDeg ? 1 : 0; // clockwise when angle decreases
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} ${sweep} ${b.x} ${b.y}`;
}


// Ink for text placed inside a coloured fill: white on dark fills, ink on light ones.
export function inkOn(hex: string, t: ChartTokens): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? (t.surface === '#FFFFFF' ? t.ink : '#0F172A') : '#FFFFFF';
}
