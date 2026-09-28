import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { PatientPersona } from '../mock/types';

export const DisclaimerBar: React.FC = () => {
  return (
    <div className="w-full p-2.5 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-2 text-center">
      <Info className="w-4 h-4 text-amber-600 shrink-0" />
      <span>This is guidance, not a medical diagnosis. In an emergency, dial 112 immediately.</span>
    </div>
  );
};

export const RedFlagBanner: React.FC<{
  onOpenEmergencyCard: () => void;
}> = ({ onOpenEmergencyCard }) => {
  return (
    <div className="w-full p-4 rounded-2xl bg-rose-600 text-white shadow-glow-red border border-rose-400 space-y-3 animate-bounce-short">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/20 rounded-xl shrink-0">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-black text-base uppercase tracking-wider">
            Critical Symptoms Detected — Seek Emergency Care Now!
          </h3>
          <p className="text-xs text-rose-100 mt-0.5">
            Your input contains emergency indicators (chest pain, breathlessness, or acute trauma). Do not wait for AI response.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <a
          href="tel:112"
          className="px-4 py-2 rounded-xl bg-white text-rose-700 font-bold text-xs flex items-center gap-2 shadow-md hover:bg-rose-50 transition-colors"
        >
          <PhoneCall className="w-4 h-4 text-rose-600" />
          <span>Call Emergency Services (112)</span>
        </a>

        <button
          onClick={onOpenEmergencyCard}
          className="px-4 py-2 rounded-xl bg-rose-800 hover:bg-rose-900 text-white font-semibold text-xs flex items-center gap-2 border border-rose-400/40 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Open Emergency Card</span>
        </button>
      </div>
    </div>
  );
};

export const DataTransparencyPopover: React.FC<{
  persona: PatientPersona;
  sharedFields: { age: boolean; conditions: boolean; allergies: boolean; medications: boolean };
  onToggleField: (field: 'age' | 'conditions' | 'allergies' | 'medications') => void;
}> = ({ persona, sharedFields, onToggleField }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-medium hover:bg-teal-100 dark:hover:bg-teal-900/80 transition-colors cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5 text-teal-600" />
        <span>Using: age ({new Date().getFullYear() - new Date(persona.dob).getFullYear()}), conditions, allergies</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-30 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-bold text-slate-900 dark:text-white">AI Data Transparency</span>
            <span className="text-[10px] text-teal-600 font-mono">Logged On-Chain</span>
          </div>

          <p className="text-[11px] text-slate-500">
            Select exactly which health vault fields are passed into the clinical LLM prompt:
          </p>

          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Age & Demographics</span>
              <input
                type="checkbox"
                checked={sharedFields.age}
                onChange={() => onToggleField('age')}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Active Conditions</span>
              <input
                type="checkbox"
                checked={sharedFields.conditions}
                onChange={() => onToggleField('conditions')}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Allergies & Sensitivities</span>
              <input
                type="checkbox"
                checked={sharedFields.allergies}
                onChange={() => onToggleField('allergies')}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-700 dark:text-slate-300">Current Medications</span>
              <input
                type="checkbox"
                checked={sharedFields.medications}
                onChange={() => onToggleField('medications')}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
            </label>
          </div>

          <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500">
            Zero raw records leave your device unencrypted. Every prompt access generates an on-chain audit receipt.
          </div>
        </div>
      )}
    </div>
  );
};
