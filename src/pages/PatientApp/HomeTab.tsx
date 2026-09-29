import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Clock, HeartPulse, ShieldAlert, ArrowRight, Activity, Calendar, FileText } from 'lucide-react';
import { PatientPersona, CheckupReminder } from '../../mock/types';
import { PatientTab } from './PatientLayout';
import { HealthIdCard } from '../../components/HealthIdCard';
import { RecentReportsModal } from '../../components/RecentReportsModal';

interface HomeTabProps {
  persona: PatientPersona;
  reminders: CheckupReminder[];
  onOpenEmergency: () => void;
  onNavigateTab: (tab: PatientTab) => void;
  onOpenScanner?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  persona,
  reminders,
  onOpenEmergency,
  onNavigateTab,
  onOpenScanner
}) => {
  const dueReminders = reminders.filter((r) => r.dueState !== 'done').slice(0, 2);
  const [recentReportsOpen, setRecentReportsOpen] = useState(false);

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

      {/* Health ID Card with Live Scannable Dynamic QR */}
      <HealthIdCard
        persona={persona}
        onOpenEmergency={onOpenEmergency}
        onOpenScanner={onOpenScanner}
      />

      {/* Quick Identity Security Access Banner */}
      <div
        onClick={() => onNavigateTab('identity')}
        className="p-4 rounded-2xl bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-400/60 transition-all cursor-pointer flex items-center justify-between shadow-[0_8px_32px_0_rgba(6,78,59,0.3)] group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Sovereign Identity & Biometric Protection
              </span>
              <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                AES-256-GCM
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80">
              Passkey WebAuthn enclave, encrypted DNA reference, and MST Testnet proof verification.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          <span>Manage Security</span>
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>

      {/* Vault Health Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('records')}
          className="p-5 rounded-2xl glass-panel hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/80">Records Verified</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {persona.verifiedRecordCount}/{persona.verifiedRecordCount}
          </div>
          <span className="text-[11px] text-emerald-400 font-medium block">
            100% On-Chain Integrity
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('access')}
          className="p-5 rounded-2xl glass-panel hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/80">Active Consents</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {persona.activeConsentCount} Hospitals
          </div>
          <span className="text-[11px] text-emerald-400 font-medium block">
            Time-bound Access Active
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('access')}
          className="p-5 rounded-2xl glass-panel hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all cursor-pointer space-y-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/80">Last External Access</span>
            <div className="p-2 rounded-xl bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {persona.lastAccessTime}
          </div>
          <span className="text-[11px] text-emerald-300/80 block font-mono">
            City General Hospital
          </span>
        </div>
      </div>

      <section className="p-5 rounded-2xl glass-panel flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-900/50 border border-emerald-500/30 text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Recent Reports</h2>
            <p className="text-xs text-emerald-200/70 mt-0.5">Review, verify, and download your latest clinical reports.</p>
          </div>
        </div>
        <button
          onClick={() => setRecentReportsOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
        >
          <Activity className="w-4 h-4" />
          View Recent Reports
        </button>
      </section>

      {/* Upcoming Checkups Strip */}
      <div className="p-5 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm">
              Upcoming Health Checkup Reminders
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('records')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dueReminders.map((rem) => (
            <div
              key={rem.id}
              className="p-3.5 rounded-xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-white block">{rem.title}</span>
                <span className="text-emerald-200/60 text-[11px] mt-0.5 block">Last done: {rem.lastDoneDate}</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  rem.dueState === 'overdue'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                }`}
              >
                {rem.dueStateLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {recentReportsOpen && (
        <RecentReportsModal patientName={persona.name} onClose={() => setRecentReportsOpen(false)} />
      )}
    </div>
  );
};
