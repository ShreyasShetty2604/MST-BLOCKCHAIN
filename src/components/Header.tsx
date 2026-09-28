import React from 'react';
import { Shield, Moon, Sun, User, Building2, ShieldAlert, Lock, Server } from 'lucide-react';
import { Role, PatientPersona } from '../mock/types';

interface HeaderProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activePersona: PatientPersona | null;
  isPatientLoggedIn?: boolean;
  onLogoutPatient?: () => void;
  onOpenBackendVisualizer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  darkMode,
  onToggleDarkMode,
  activePersona,
  isPatientLoggedIn = false,
  onLogoutPatient,
  onOpenBackendVisualizer
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & ID Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-700 flex items-center justify-center text-white shadow-glow-teal shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">
                MediVault
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                MediID
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Patient-Controlled Records • Blockchain Audit Trail
            </p>
          </div>
        </div>

        {/* Center: Role Switcher (Discreet Dev/Demo Control) */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-inner">
          <button
            onClick={() => onRoleChange('patient')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentRole === 'patient'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          <button
            onClick={() => onRoleChange('hospital')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentRole === 'hospital'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              currentRole === 'admin'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Right Actions: Persona indicator, Backend Visualizer, Lock button & Dark Mode */}
        <div className="flex items-center gap-2.5">
          {/* Backend Visualizer Trigger Button */}
          {onOpenBackendVisualizer && (
            <button
              onClick={onOpenBackendVisualizer}
              className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 transition-colors shadow-xs"
              title="Open Live Backend & Smart Contract Visualizer"
            >
              <Server className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden md:inline">Backend Visualizer</span>
            </button>
          )}

          {activePersona && currentRole === 'patient' && isPatientLoggedIn && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center">
                  {activePersona.name.charAt(0)}
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">
                    {activePersona.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activePersona.mediId}
                  </span>
                </div>
              </div>

              {onLogoutPatient && (
                <button
                  onClick={onLogoutPatient}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-800 transition-colors"
                  title="Lock Vault & Log Out"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lock Vault</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
