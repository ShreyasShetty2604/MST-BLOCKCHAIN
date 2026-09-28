import React from 'react';
import { ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

export const VerifiedBadge: React.FC<{ label?: string; className?: string }> = ({
  label = 'Hospital Verified',
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 ${className}`}
    >
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span>{label}</span>
    </span>
  );
};

export const SelfDeclaredBadge: React.FC<{ label?: string; className?: string }> = ({
  label = 'Self-Declared',
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
    >
      <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      <span>{label}</span>
    </span>
  );
};

export const TamperAlertBadge: React.FC<{ label?: string; className?: string }> = ({
  label = 'TAMPER ALERT - HASH MISMATCH',
  className = ''
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse ${className}`}
    >
      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
      <span>{label}</span>
    </span>
  );
};
