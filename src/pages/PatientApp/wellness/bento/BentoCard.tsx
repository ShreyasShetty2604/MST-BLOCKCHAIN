import React from 'react';
import { ChevronRight } from 'lucide-react';

// Styles used only by the Wellness dashboard (prefixed wv-, injected by the page itself so
// nothing leaks into shared CSS). The grid follows its own width, not the window: the
// Wellness column is narrow on laptops because of the sidebar and the logs panel.
export const BentoStyles: React.FC = () => (
  <style>{`
.wv-bento { container-type: inline-size; }
.wv-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
@container (min-width: 520px) {
  .wv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wv-full, .wv-wide { grid-column: span 2; }
}
@container (min-width: 900px) {
  .wv-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .wv-full { grid-column: span 4; }
  .wv-half { grid-column: span 2; }
  .wv-three { grid-column: span 3; }
}
.wv-grid2 { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
.wv-highlights { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container (min-width: 620px) { .wv-grid2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container (min-width: 760px) { .wv-highlights { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@keyframes wv-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.wv-rise { animation: wv-rise 500ms cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes wv-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
.wv-pop { animation: wv-pop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes wv-unlock {
  0% { transform: scale(0.5) rotate(-20deg); filter: grayscale(1); }
  55% { transform: scale(1.18) rotate(6deg); filter: grayscale(0); }
  100% { transform: scale(1) rotate(0); }
}
.wv-unlock { animation: wv-unlock 800ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes wv-shine { from { transform: translateX(-120%) skewX(-20deg); } to { transform: translateX(220%) skewX(-20deg); } }
.wv-shine::after {
  content: ''; position: absolute; inset: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
  animation: wv-shine 900ms 250ms ease-out both; pointer-events: none;
}
.wv-scroll { scrollbar-width: none; }
.wv-scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) {
  .wv-rise, .wv-pop, .wv-unlock, .wv-shine::after { animation: none; }
}
`}</style>
);

export type BentoSpan = 'one' | 'half' | 'wide' | 'three' | 'full';
const SPAN_CLASS: Record<BentoSpan, string> = {
  one: '',
  half: 'wv-half', // 2 of 4 columns; 1 of 2
  wide: 'wv-wide wv-half', // 2 of 4 columns; 2 of 2
  three: 'wv-three', // 3 of 4 columns; 1 of 2
  full: 'wv-full'
};

interface BentoCardProps {
  title: string;
  color?: string; // metric colour for the title (Apple-style); default muted ink
  span?: BentoSpan;
  onOpen: () => void;
  aside?: React.ReactNode; // small note next to the title (e.g. "Demo data")
  delay?: number; // entrance stagger, ms
  className?: string;
  children: React.ReactNode;
}

// Rounded card with a coloured title and a › that opens the detailed view. The whole card is
// clickable, except its own buttons/inputs; the › button is the keyboard route.
export const BentoCard: React.FC<BentoCardProps> = ({ title, color, span = 'one', onOpen, aside, delay = 0, className = '', children }) => (
  <section
    onClick={(e) => {
      if (!(e.target as HTMLElement).closest('button, a, input, select, label, textarea')) onOpen();
    }}
    style={{ animationDelay: `${delay}ms` }}
    className={`wv-rise group relative cursor-pointer rounded-[20px] bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:shadow-none dark:ring-1 dark:ring-white/[0.05] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_18px_36px_-14px_rgba(15,23,42,0.22)] dark:hover:ring-white/[0.10] flex flex-col ${SPAN_CLASS[span]} ${className}`}
  >
    <header className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: color ?? undefined }}>
        <span className={color ? '' : 'text-slate-900 dark:text-white'}>{title}</span>
      </h2>
      <span className="flex items-center gap-2 min-w-0">
        {aside}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${title}`}
          className="w-7 h-7 -mr-1 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:bg-slate-100 dark:group-hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </span>
    </header>
    <div className="flex-1 flex flex-col min-w-0">{children}</div>
  </section>
);

// Tiny muted marker for illustrative numbers.
export const DemoTag: React.FC = () => <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">Demo data</span>;

// Big number + unit, Apple style.
export const BigNumber: React.FC<{ value: string; unit?: string; color?: string; className?: string }> = ({ value, unit, color, className = '' }) => (
  <span className={`font-bold tracking-tight tabular-nums leading-none ${className}`} style={{ color }}>
    <span className={color ? '' : 'text-slate-900 dark:text-white'}>{value}</span>
    {unit && <span className="text-[0.45em] font-semibold ml-1 opacity-80">{unit}</span>}
  </span>
);
