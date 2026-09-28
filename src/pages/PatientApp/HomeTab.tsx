import React from 'react';
import { ShieldCheck, KeyRound, Clock, HeartPulse, ShieldAlert, ArrowRight, Activity, Calendar } from 'lucide-react';
import { PatientPersona, CheckupReminder } from '../../mock/types';
import { HealthIdCard } from '../../components/HealthIdCard';

interface HomeTabProps {
  persona: PatientPersona;
  reminders: CheckupReminder[];
  onOpenEmergency: () => void;
  onNavigateTab: (tab: 'records' | 'access' | 'wellness') => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  persona,
  reminders,
  onOpenEmergency,
  onNavigateTab
}) => {
  const dueReminders = reminders.filter((r) => r.dueState !== 'done').slice(0, 2);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-teal-700 dark:text-teal-400 font-bold uppercase tracking-wider block">
            Cryptographic Vault Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back, {persona.name.split(' ')[0]}
          </h1>
        </div>

        <button
          onClick={onOpenEmergency}
          className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 animate-pulse-glow"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Emergency Card</span>
        </button>
      </div>

      {/* Health ID Card */}
      <HealthIdCard persona={persona} onOpenEmergency={onOpenEmergency} />

      {/* Vault Health Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('records')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card hover:shadow-card-hover transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Records Verified</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {persona.verifiedRecordCount}/{persona.verifiedRecordCount}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">
            100% On-Chain Integrity
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('access')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card hover:shadow-card-hover transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Consents</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {persona.activeConsentCount} Hospitals
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block">
            Time-bound Access Active
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('access')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card hover:shadow-card-hover transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Last External Access</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {persona.lastAccessTime}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            City General Hospital
          </span>
        </div>
      </div>

      {/* Upcoming Checkups Strip */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Upcoming Health Checkup Reminders
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('wellness')}
            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dueReminders.map((rem) => (
            <div
              key={rem.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">{rem.title}</span>
                <span className="text-slate-500 text-[11px] mt-0.5 block">Last done: {rem.lastDoneDate}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  rem.dueState === 'overdue'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200'
                }`}
              >
                {rem.dueStateLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
