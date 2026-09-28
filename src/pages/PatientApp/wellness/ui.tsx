import React, { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

// Design tokens for the Wellness page: one teal accent, soft shadows, 16px radius, 24px padding.
// Type scale: text-3xl (page title), text-lg (section title), text-base/sm (card content), text-xs (labels).

export const Card: React.FC<{ className?: string; interactive?: boolean; children: React.ReactNode; as?: 'div' | 'button'; onClick?: () => void }> = ({
  className = '',
  interactive = false,
  as = 'div',
  onClick,
  children
}) => {
  const classes = `rounded-2xl bg-white dark:bg-slate-900 shadow-card dark:shadow-none dark:ring-1 dark:ring-white/[0.06] p-6 ${
    interactive ? 'transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 dark:hover:ring-white/[0.12]' : ''
  } ${className}`;
  return as === 'button' ? (
    <button type="button" onClick={onClick} className={`text-left w-full ${classes}`}>
      {children}
    </button>
  ) : (
    <div className={classes}>{children}</div>
  );
};

export const Label: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`text-xs font-medium text-slate-500 dark:text-slate-400 ${className}`}>{children}</span>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const IconTile: React.FC<{ icon: LucideIcon; className?: string }> = ({ icon: Icon, className = '' }) => (
  <span className={`w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 ${className}`}>
    <Icon className="w-5 h-5" />
  </span>
);

export const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ${className}`}>
    {children}
  </span>
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon }> = ({ icon: Icon, className = '', children, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors ${className}`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

// Expandable secondary info ("Why this plan", rule details).
export const Disclosure: React.FC<{ summary: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; className?: string }> = ({
  summary,
  children,
  defaultOpen = false,
  className = ''
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
      >
        <span className="min-w-0">{summary}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pt-3 animate-fade-in">{children}</div>}
    </div>
  );
};

// Small muted marker for illustrative data that isn't from the patient's records.
export const DemoLabel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`text-xs text-slate-400 dark:text-slate-500 ${className}`}>Demo data</span>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`} />
);

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

// Segmented tab bar; scrolls horizontally on small screens.
export function TabBar<T extends string>({ tabs, active, onChange }: { tabs: TabDef<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="inline-flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              active === id
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
