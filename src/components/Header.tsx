import React from 'react';
import { Shield, Moon, Sun, User, Building2, ShieldAlert, Lock, Server, Camera } from 'lucide-react';
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
  onOpenScanner?: () => void;
  isHospitalLoggedIn?: boolean;
  hospitalFacilityName?: string;
  onLogoutHospital?: () => void;
  isAdminLoggedIn?: boolean;
  adminOfficerName?: string;
  onLogoutAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  darkMode,
  onToggleDarkMode,
  activePersona,
  isPatientLoggedIn = false,
  onLogoutPatient,
  onOpenBackendVisualizer,
  onOpenScanner,
  isHospitalLoggedIn = false,
  hospitalFacilityName,
  onLogoutHospital,
  isAdminLoggedIn = false,
  adminOfficerName,
  onLogoutAdmin
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-emerald-950/80 backdrop-blur-xl border-b border-emerald-500/20 shadow-[0_4px_20px_rgba(6,78,59,0.25)] transition-colors">
      <div className="w-full pl-2 sm:pl-3 lg:pl-4 pr-4 sm:pr-6 lg:pr-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & ID Brand */}
        <div className="flex items-center gap-3">
          {/* Official Emblem Icon */}
          <div className="w-10 h-10 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center p-1 shadow-sm shrink-0 overflow-hidden backdrop-blur-md">
            <img src="/logo.png" alt="MediVault Emblem" className="w-full h-full object-contain" />
          </div>

          {/* Refined MEDiVault Brand Header */}
          <div>
            <div className="flex items-center gap-2">
              <img
                src="/logo-brand.png"
                alt="MEDiVault Brand"
                className="h-7 sm:h-8 object-contain brightness-125 bg-emerald-900/40 px-2 py-0.5 rounded-lg border border-emerald-500/30 transition-all shadow-xs"
              />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 shrink-0">
                MediID
              </span>
            </div>
            <p className="text-[10px] text-emerald-400/80 font-medium hidden sm:block mt-0.5">
              Patient-Controlled Records • Blockchain Audit Trail
            </p>
          </div>
        </div>

        {/* Center: Role Switcher (Discreet Dev/Demo Control) */}
        <div className="p-1 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-1 shadow-inner backdrop-blur-md">
          <button
            onClick={() => onRoleChange('patient')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRole === 'patient'
                ? 'bg-emerald-800/90 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
                : 'text-emerald-300/80 hover:text-emerald-100 hover:bg-emerald-900/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          <button
            onClick={() => onRoleChange('hospital')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRole === 'hospital'
                ? 'bg-emerald-800/90 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
                : 'text-emerald-300/80 hover:text-emerald-100 hover:bg-emerald-900/40'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital</span>
          </button>

          <button
            onClick={() => onRoleChange('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentRole === 'admin'
                ? 'bg-emerald-800/90 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-400/50'
                : 'text-emerald-300/80 hover:text-emerald-100 hover:bg-emerald-900/40'
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

          {currentRole === 'hospital' && isHospitalLoggedIn && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 hidden sm:inline">
                {hospitalFacilityName || 'Hospital Active'}
              </span>
              {onLogoutHospital && (
                <button
                  onClick={onLogoutHospital}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                  title="Exit Hospital Session"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              )}
            </div>
          )}

          {currentRole === 'admin' && isAdminLoggedIn && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hidden sm:inline">
                {adminOfficerName || 'National Admin'}
              </span>
              {onLogoutAdmin && (
                <button
                  onClick={onLogoutAdmin}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                  title="Lock Governance Session"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Lock</span>
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
