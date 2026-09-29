import React from 'react';
import { Home, ShieldCheck, FileText, KeyRound, Bot, HeartPulse } from 'lucide-react';
import { PatientPersona } from '../../mock/types';
import { RightSystemLogsPanel } from '../../components/RightSystemLogsPanel';

export type PatientTab = 'home' | 'identity' | 'records' | 'access' | 'assistant' | 'wellness';

interface PatientLayoutProps {
  activeTab: PatientTab;
  onTabChange: (tab: PatientTab) => void;
  persona?: PatientPersona | null;
  onOpenBackendVisualizer?: () => void;
  children: React.ReactNode;
}

export const PatientLayout: React.FC<PatientLayoutProps> = ({
  activeTab,
  onTabChange,
  persona,
  onOpenBackendVisualizer,
  children
}) => {
  const tabs: { id: PatientTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'identity', label: 'Identity & Security', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'records', label: 'Records', icon: <FileText className="w-5 h-5" /> },
    { id: 'access', label: 'Access', icon: <KeyRound className="w-5 h-5" /> },
    { id: 'assistant', label: 'Assistant', icon: <Bot className="w-5 h-5" /> },
    { id: 'wellness', label: 'Wellness', icon: <HeartPulse className="w-5 h-5" /> }
  ];

  // Default patient avatar if none provided on persona
  const displayAvatar = persona?.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80";
  const displayName = persona?.name || "Brendan Lim";

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full pl-2 sm:pl-3 lg:pl-4 pr-4 sm:pr-6 lg:pr-8 py-6 gap-6">
      {/* DESKTOP SIDE PANEL (MATCHING MOCKUP DESIGN) */}
      <aside className="hidden md:flex flex-col w-72 shrink-0 space-y-4">
        {/* PATIENT PROFILE DARK CARD */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900 text-white p-6 border border-slate-700/80 shadow-md flex flex-col items-center justify-center text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 mb-3">
            <div className="w-20 h-20 rounded-full border-2 border-slate-200/50 shadow-md overflow-hidden bg-slate-700 flex items-center justify-center">
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initial avatar if remote image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="text-2xl font-bold text-slate-200 uppercase">
                {displayName.charAt(0)}
              </span>
            </div>
          </div>
          <h3 className="relative z-10 text-lg font-medium tracking-wide text-slate-100">
            {displayName}
          </h3>
        </div>

        {/* DUAL-COLUMN NAVIGATION PANEL (ICON RAIL + LABEL PANEL) */}
        <div className="flex gap-2.5 w-full">
          {/* LEFT COLUMN: ICON RAIL */}
          <div className="w-14 border border-emerald-500/25 rounded-2xl p-1.5 bg-emerald-950/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(6,78,59,0.3)] flex flex-col gap-2 shrink-0 items-center justify-start">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  title={tab.label}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800/80 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
                      : 'text-emerald-300/80 hover:bg-emerald-900/40 hover:text-emerald-100'
                  }`}
                >
                  {tab.icon}
                </button>
              );
            })}
          </div>

          {/* RIGHT COLUMN: TEXT MENU PANEL */}
          <div className="flex-1 border border-emerald-500/25 rounded-2xl p-1.5 bg-emerald-950/40 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(6,78,59,0.3)] flex flex-col gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full h-11 px-3 rounded-xl text-xs flex items-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800/80 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
                      : 'text-emerald-300/80 hover:bg-emerald-900/40 hover:text-emerald-100 font-medium'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      {/* RIGHT SIDE SYSTEM & PACKET LOGS PANEL */}
      <RightSystemLogsPanel onOpenBackendVisualizer={onOpenBackendVisualizer} />

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 md:hidden px-2 py-2 flex items-center justify-around shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-teal-700 dark:text-teal-400 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className={isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400'}>
                {tab.icon}
              </div>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};


