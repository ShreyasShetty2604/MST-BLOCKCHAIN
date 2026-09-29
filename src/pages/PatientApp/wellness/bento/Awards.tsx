import React, { useEffect, useId, useRef, useState } from 'react';
import { CandyOff, Droplets, CalendarCheck, ScanLine, Flame, Lock, LucideIcon } from 'lucide-react';

// Original badge art: a rounded hexagon "gem" with a two-tone gradient, an inner bevel and a
// ribbon notch. Locked badges are greyscale with their progress shown underneath.

export interface Award {
  id: string;
  title: string;
  how: string; // how to earn it
  icon: LucideIcon;
  colors: [string, string]; // gradient light → deep
  progress: number; // 0–1
  status: string; // e.g. "5 / 8 glasses"
}

export interface AwardInputs {
  lowSugarStreak: number;
  water: number;
  waterGoal: number;
  scans: number;
  activityMinutes: number;
  checkupOnTime: boolean;
  checkupStatus: string;
}

export function buildAwards(a: AwardInputs): Award[] {
  return [
    {
      id: 'low-sugar',
      title: '7-day low-sugar streak',
      how: 'Keep sweets and sugary drinks off your plate for 7 days in a row.',
      icon: CandyOff,
      colors: ['#C4B5FD', '#6D28D9'],
      progress: Math.min(1, a.lowSugarStreak / 7),
      status: `${Math.min(a.lowSugarStreak, 7)} / 7 days`
    },
    {
      id: 'hydration',
      title: 'Hydration hero',
      how: `Drink all ${a.waterGoal} glasses of water in a day.`,
      icon: Droplets,
      colors: ['#7DD3FC', '#0369A1'],
      progress: Math.min(1, a.water / a.waterGoal),
      status: `${Math.min(a.water, a.waterGoal)} / ${a.waterGoal} glasses`
    },
    {
      id: 'checkup',
      title: 'Checkup on time',
      how: 'Have your latest checkup done within its recommended interval.',
      icon: CalendarCheck,
      colors: ['#5EEAD4', '#0F766E'],
      progress: a.checkupOnTime ? 1 : 0,
      status: a.checkupStatus
    },
    {
      id: 'mindful',
      title: 'Mindful eater',
      how: 'Scan a meal before you eat it.',
      icon: ScanLine,
      colors: ['#FDBA74', '#C2410C'],
      progress: Math.min(1, a.scans),
      status: a.scans > 0 ? `${a.scans} scanned today` : 'No scans yet today'
    },
    {
      id: 'active',
      title: 'Active 30',
      how: 'Log 30 minutes of walking, yoga or cycling in a day.',
      icon: Flame,
      colors: ['#D9F99D', '#4D7C0F'],
      progress: Math.min(1, a.activityMinutes / 30),
      status: `${Math.min(a.activityMinutes, 30)} / 30 min`
    }
  ];
}

const HEX = (s: number, inset: number) => {
  const c = s / 2;
  const r = c - inset;
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
  }).join(' ');
};

export const Badge: React.FC<{ award: Award; size?: number; justUnlocked?: boolean; delay?: number }> = ({ award, size = 64, justUnlocked, delay = 0 }) => {
  const gid = useId().replace(/:/g, '');
  const unlocked = award.progress >= 1;
  const Icon = unlocked ? award.icon : Lock;
  const [top, deep] = unlocked ? award.colors : ['#E2E8F0', '#94A3B8'];
  return (
    <div
      className={`relative shrink-0 ${justUnlocked ? 'wv-unlock' : unlocked ? 'wv-pop' : ''}`}
      style={{ width: size, height: size, animationDelay: justUnlocked ? '0ms' : `${delay}ms` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={unlocked ? '' : 'opacity-60 dark:opacity-40'}>
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={deep} />
          </linearGradient>
        </defs>
        {/* ribbon tails */}
        <path d={`M ${size * 0.32} ${size * 0.72} L ${size * 0.26} ${size * 0.98} L ${size * 0.4} ${size * 0.9} L ${size * 0.5} ${size * 0.98} L ${size * 0.5} ${size * 0.74} Z`} fill={deep} opacity={0.9} />
        <path d={`M ${size * 0.68} ${size * 0.72} L ${size * 0.74} ${size * 0.98} L ${size * 0.6} ${size * 0.9} L ${size * 0.5} ${size * 0.98} L ${size * 0.5} ${size * 0.74} Z`} fill={deep} opacity={0.75} />
        <polygon points={HEX(size, size * 0.1)} fill={`url(#g${gid})`} stroke={`url(#g${gid})`} strokeWidth={size * 0.1} strokeLinejoin="round" />
        <polygon points={HEX(size, size * 0.2)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: size * 0.04 }}>
        <Icon className="text-white drop-shadow-sm" style={{ width: size * 0.34, height: size * 0.34 }} strokeWidth={2.4} />
      </span>
      {justUnlocked && <span className="wv-shine absolute inset-[12%] rounded-full overflow-hidden" />}
    </div>
  );
};

// Remembers which awards were unlocked when the page opened; anything that unlocks after that
// plays the unlock animation once and is reported through onUnlock (e.g. a toast).
export function useNewUnlocks(awards: Award[], onUnlock?: (a: Award) => void): Set<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    const unlocked = awards.filter((a) => a.progress >= 1);
    if (seen.current === null) {
      seen.current = new Set(unlocked.map((a) => a.id));
      return;
    }
    const newly = unlocked.filter((a) => !seen.current!.has(a.id));
    if (!newly.length) return;
    newly.forEach((a) => {
      seen.current!.add(a.id);
      onUnlock?.(a);
    });
    setFresh((prev) => new Set([...prev, ...newly.map((a) => a.id)]));
  }, [awards, onUnlock]);
  return fresh;
}

export const AwardsRow: React.FC<{ awards: Award[]; fresh: Set<string> }> = ({ awards, fresh }) => (
  <ul className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-2 gap-y-4">
    {awards.map((a, i) => (
      <li key={a.id} className="flex flex-col items-center text-center gap-2 min-w-0" title={`${a.title}: ${a.how}`}>
        <Badge award={a} justUnlocked={fresh.has(a.id)} delay={150 + i * 80} />
        <span className={`text-[11px] leading-tight font-semibold ${a.progress >= 1 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{a.title}</span>
      </li>
    ))}
  </ul>
);
