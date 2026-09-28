import React from 'react';
import { PhoneCall, HeartPulse, AlertTriangle, ShieldCheck, X, Activity, Pill } from 'lucide-react';
import { PatientPersona } from '../mock/types';
import { ChainBadge } from './ChainBadge';

interface EmergencySheetProps {
  isOpen: boolean;
  onClose: () => void;
  persona: PatientPersona;
}

export const EmergencySheet: React.FC<EmergencySheetProps> = ({ isOpen, onClose, persona }) => {
  if (!isOpen) return null;

  const { emergencyInfo } = persona;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-300 dark:border-rose-900/60 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Emergency Red Header */}
        <div className="bg-rose-600 dark:bg-rose-700 p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <HeartPulse className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-rose-100 font-semibold block">
                EMERGENCY MEDICAL PROFILE
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {persona.name}
              </h2>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-xl text-sm font-bold bg-white text-rose-700 shadow-sm flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              Blood Group: {emergencyInfo.bloodGroup}
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-mono bg-rose-900/60 text-white border border-rose-400/30">
              MediID: {persona.mediId}
            </span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Allergies Block */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Severe Allergies</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {emergencyInfo.allergies.map((allergy, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-800"
                >
                  ⚠️ {allergy}
                </span>
              ))}
            </div>
          </div>

          {/* Active Conditions */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm uppercase tracking-wider">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Active Medical Conditions</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside pt-1">
              {emergencyInfo.conditions.map((cond, idx) => (
                <li key={idx} className="font-semibold">{cond}</li>
              ))}
            </ul>
          </div>

          {/* Active Medications */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm uppercase tracking-wider">
              <Pill className="w-4 h-4 text-indigo-600" />
              <span>Current Medications</span>
            </div>
            <div className="space-y-2 pt-1">
              {emergencyInfo.medications.map((med, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{med.name} ({med.dosage})</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">{med.frequency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-2">
            <span className="text-xs uppercase font-bold text-teal-800 dark:text-teal-300 tracking-wider block">
              Primary Emergency Contact
            </span>
            <div className="flex items-center justify-between text-xs pt-1">
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-base">
                  {emergencyInfo.emergencyContact.name} ({emergencyInfo.emergencyContact.relation})
                </p>
                <p className="font-mono text-teal-700 dark:text-teal-300 font-semibold mt-0.5">
                  {emergencyInfo.emergencyContact.phone}
                </p>
              </div>
              <a
                href={`tel:${emergencyInfo.emergencyContact.phone}`}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Contact</span>
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Emergency access automatically logged on-chain.</span>
            <ChainBadge txHash="0xe5f6a1b2c3d47890123456789abcdef012345682" label="Emergency Audit Hash" />
          </div>
        </div>

        {/* Bottom Call 112 Bar */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Tier 1 Emergency Card Verified</span>
          </div>

          <a
            href="tel:112"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg animate-bounce"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Emergency Services (112)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
