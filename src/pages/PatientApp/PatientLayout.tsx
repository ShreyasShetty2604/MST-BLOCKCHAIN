import React from 'react';
import { Home, FileText, KeyRound, Bot, HeartPulse } from 'lucide-react';

export type PatientTab = 'home' | 'records' | 'access' | 'assistant' | 'wellness';

interface PatientLayoutProps {
  activeTab: PatientTab;
  onTabChange: (tab: PatientTab) => void;
  children: React.ReactNode;
}

export const PatientLayout: React.FC<PatientLayoutProps> = ({
  activeTab,
  onTabChange,
  children
}) => {
  const tabs: { id: PatientTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'records', label: 'Records', icon: <FileText className="w-5 h-5" /> },
    { id: 'access', label: 'Access', icon: <KeyRound className="w-5 h-5" /> },
    { id: 'assistant', label: 'Assistant', icon: <Bot className="w-5 h-5" /> },
    { id: 'wellness', label: 'Wellness', icon: <HeartPulse className="w-5 h-5" /> }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
      {/* DESKTOP LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1">
            Patient Vault Navigation
          </span>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-3 transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

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
