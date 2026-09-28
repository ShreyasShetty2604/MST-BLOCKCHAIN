import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, UserCheck, ShieldAlert, FastForward, AlertTriangle, Send, X, Check } from 'lucide-react';
import { mockApi } from '../mock/api';
import { PatientPersona } from '../mock/types';

interface DemoToolsDrawerProps {
  onStateChange: () => void;
  onShowToast: (msg: string) => void;
}

export const DemoToolsDrawer: React.FC<DemoToolsDrawerProps> = ({ onStateChange, onShowToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [personas, setPersonas] = useState<PatientPersona[]>([]);
  const [activeId, setActiveId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      mockApi.getPersonas().then(setPersonas);
      mockApi.getActivePersonaId().then(setActiveId);
    }
  }, [isOpen]);

  const handleSelectPersona = async (id: string) => {
    setIsProcessing(true);
    try {
      const p = await mockApi.setActivePersonaId(id);
      setActiveId(p?.id ?? '');
      onShowToast(`Loaded persona: ${p.name} (${p.emergencyInfo.conditions[0] || 'Healthy'})`);
      onStateChange();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTamperRecord = async () => {
    setIsProcessing(true);
    try {
      const res = await mockApi.tamperRecordDemo();
      onShowToast(`Tampered hash for "${res.title}". Run integrity scan to detect!`);
      onStateChange();
    } catch (e: any) {
      onShowToast(e.message || 'Tamper failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerIncomingRequest = async () => {
    setIsProcessing(true);
    try {
      const req = await mockApi.triggerIncomingRequestDemo();
      onShowToast(`Incoming access request triggered from ${req.hospitalName}`);
      onStateChange();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerEmergency = async () => {
    setIsProcessing(true);
    try {
      await mockApi.triggerEmergencyBreakGlass(
        'hosp-02',
        'Sunrise Hospital ER',
        'Acute Trauma Triage',
        'Unconscious patient admitted to emergency resuscitation bay'
      );
      onShowToast('Emergency BREAK-GLASS access invoked and logged on-chain!');
      onStateChange();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFastForwardReminders = async () => {
    setIsProcessing(true);
    try {
      await mockApi.fastForwardReminders(30);
      onShowToast('Fast-forwarded checkup reminders by +30 days!');
      onStateChange();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDemo = async () => {
    setIsProcessing(true);
    try {
      await mockApi.resetDemoData();
      const p = await mockApi.getCurrentPatient();
      setActiveId(p?.id ?? '');
      onShowToast('Demo state reset to initial seed data!');
      onStateChange();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Drawer Trigger in bottom right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 px-3 py-2 rounded-xl bg-slate-900/90 dark:bg-slate-800/90 text-teal-400 border border-slate-700 hover:border-teal-500 shadow-xl backdrop-blur-md text-xs font-mono flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
        title="Presenter Demo Controls (Ctrl+K)"
      >
        <Sliders className="w-4 h-4 text-teal-400 animate-spin-slow" />
        <span>Demo Tools</span>
        <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-sans border border-slate-700">
          Ctrl+K
        </kbd>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-950 rounded-lg text-teal-700 dark:text-teal-300">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Presenter Demo Toolbox</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Mutate mock state instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* Persona Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                  Load Persona Preset
                </label>
                <div className="space-y-1.5">
                  {personas.map((p) => {
                    const isSelected = p.id === activeId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPersona(p.id)}
                        disabled={isProcessing}
                        className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 text-teal-900 dark:text-teal-100 font-bold'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                              {p.emergencyInfo.bloodGroup}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-normal">
                            {p.emergencyInfo.conditions[0] || 'Healthy'} • {p.dob}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Instant Actions */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Simulations & Scenario Triggers
                </label>

                <button
                  onClick={handleTamperRecord}
                  disabled={isProcessing}
                  className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 hover:bg-rose-100 text-xs font-semibold flex items-center justify-between transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Tamper Record (Hash Mismatch)</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">Demo Scan</span>
                </button>

                <button
                  onClick={handleTriggerIncomingRequest}
                  disabled={isProcessing}
                  className="w-full p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 text-xs font-semibold flex items-center justify-between transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" />
                    <span>Trigger Hospital Access Request</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">Sunrise ER</span>
                </button>

                <button
                  onClick={handleTriggerEmergency}
                  disabled={isProcessing}
                  className="w-full p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 hover:bg-rose-200 text-xs font-semibold flex items-center justify-between transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Trigger Break-Glass Emergency</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">Audit Log</span>
                </button>

                <button
                  onClick={handleFastForwardReminders}
                  disabled={isProcessing}
                  className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 hover:bg-amber-100 text-xs font-semibold flex items-center justify-between transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <FastForward className="w-4 h-4 text-amber-600" />
                    <span>Fast-Forward Reminders (+30 Days)</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">Wellness</span>
                </button>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* Reset Data */}
              <button
                onClick={handleResetDemo}
                disabled={isProcessing}
                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
                <span>Reset All Demo Data & Storage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
