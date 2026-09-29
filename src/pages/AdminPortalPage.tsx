import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, Building2, Plus, Trash2, Activity, ShieldCheck, Flag,
  TrendingUp, CheckCircle2, X, AlertTriangle, Check, XCircle, Clock
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Hospital, SystemStats, AuditLog } from '../mock/types';
import { mockApi } from '../mock/api';
import { truncateHash } from '../lib/formatters';
import { Lock } from 'lucide-react';
import { AdminOfficerSession } from './AdminLandingPage';

interface AdminPortalPageProps {
  onShowToast: (msg: string) => void;
  session?: AdminOfficerSession | null;
  onLogout?: () => void;
}

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({ onShowToast, session, onLogout }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [flaggedLogs, setFlaggedLogs] = useState<AuditLog[]>([]);

  // Add hospital modal
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [hospName, setHospName] = useState('');
  const [hospWallet, setHospWallet] = useState('0x9876...5432');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    const h = await mockApi.getHospitals();
    const s = await mockApi.getSystemStats();
    const a = await mockApi.getAllAuditLogs();
    setHospitals(h);
    setStats(s);
    setFlaggedLogs(a.filter((log) => log.isFlagged));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName) return;
    setIsSubmitting(true);
    try {
      const created = await mockApi.addHospital({
        name: hospName,
        walletAddress: hospWallet || '0x' + Math.random().toString(16).slice(2, 42)
      });
      setShowAddHospital(false);
      setHospName('');
      onShowToast(`Hospital registered: ${created.name}`);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveHospitalRequest = async (id: string, name: string) => {
    try {
      const res = await mockApi.approveHospitalRegistration(id);
      if (res) {
        onShowToast(`✓ Approved registration for ${name}! Granted smart contract issuing rights.`);
        await loadData();
      }
    } catch (err: any) {
      onShowToast('Approval error: ' + (err?.message || 'Error'));
    }
  };

  const handleDeclineHospitalRequest = async (id: string, name: string) => {
    if (confirm(`Decline and reject hospital registration application for ${name}?`)) {
      try {
        await mockApi.rejectHospitalRegistration(id);
        onShowToast(`Application declined for ${name}`);
        await loadData();
      } catch (err: any) {
        onShowToast('Decline error: ' + (err?.message || 'Error'));
      }
    }
  };

  const handleRemoveHospital = async (id: string, name: string) => {
    if (confirm(`Revoke approval for ${name}?`)) {
      await mockApi.removeHospital(id);
      onShowToast(`Revoked approval for ${name}`);
      await loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-emerald-100 font-sans">
      {/* Header & Network Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl glass-panel shadow-card border border-emerald-500/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              MediVault System Admin & Network Telemetry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
              Level 5 Authority
            </span>
          </div>
          <p className="text-xs text-emerald-200/70 mt-1 flex flex-wrap items-center gap-2">
            <span>{session?.officerName ? `${session.officerName} (${session.designation})` : 'National Health Authority'}</span>
            <span>•</span>
            <span className="font-mono">{session?.badgeNumber || 'GOV-NDHM-9014'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-xs shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MST Testnet (91562037)</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-2xl glass-panel hover:border-emerald-400 text-emerald-200 font-semibold text-xs border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Lock Governance Session"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Session</span>
            </button>
          )}
        </div>
      </div>

      {/* System Telemetry Stats Tiles */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl glass-panel border border-emerald-500/30 shadow-card space-y-1">
            <span className="text-xs font-semibold text-slate-400">Total Patient Vaults</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalVaults.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12% this month
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-1">
            <span className="text-xs font-semibold text-slate-400">Records Anchored On-Chain</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.recordsAnchored.toLocaleString()}
            </div>
            <span className="text-[11px] text-indigo-600 font-medium">100% SHA-256 Validated</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-1">
            <span className="text-xs font-semibold text-slate-400">Consents Granted</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.consentsGranted.toLocaleString()}
            </div>
            <span className="text-[11px] text-teal-600 font-medium">Time-Bound Smart Contracts</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-1">
            <span className="text-xs font-semibold text-slate-400">Break-Glass Emergencies</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.emergenciesUsed}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">0.07% of total accesses</span>
          </div>
        </div>
      )}

      {/* Analytics Recharts Sparkline Trend */}
      {stats && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <span>Weekly Network Audit Volume & Emergency Spikes</span>
              </h3>
              <p className="text-xs text-slate-500">Real-time access transactions vs emergency break-glass invocations</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyAuditsTrend}>
                <defs>
                  <linearGradient id="colorAccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F766E" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0F766E" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEmergencies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="accesses" stroke="#0F766E" fillOpacity={1} fill="url(#colorAccess)" name="Routine Accesses" />
                <Area type="monotone" dataKey="emergencies" stroke="#EF4444" fillOpacity={1} fill="url(#colorEmergencies)" name="Emergency Break-Glass" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Flagged Misuse Review Section */}
      {flaggedLogs.length > 0 && (
        <div className="p-6 rounded-3xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-base">
            <Flag className="w-5 h-5 text-rose-600" />
            <span>Patient Misuse Flags Pending Review ({flaggedLogs.length})</span>
          </div>

          <div className="space-y-3">
            {flaggedLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 flex flex-wrap items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{log.actor}</span>
                  <span className="text-slate-600 dark:text-slate-400 block mt-0.5">{log.action}</span>
                  <span className="text-rose-700 dark:text-rose-400 font-mono font-semibold block mt-1">
                    Patient Flag Note: "{log.flagReason}"
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onShowToast('Issued compliance warning to hospital compliance team.');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    Sanction Hospital
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Hospital Applications Section */}
      {hospitals.some((h) => h.status === 'Pending') && (
        <div className="p-6 rounded-3xl bg-amber-50/70 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-900/60 shadow-card space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 dark:text-amber-200 text-base">
                  Pending Healthcare Facility Accreditation Applications ({hospitals.filter((h) => h.status === 'Pending').length})
                </h3>
                <p className="text-xs text-amber-700/80 dark:text-amber-400">
                  New institutions requesting medical record issuance authority on MST Testnet. Review and Approve or Decline.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.filter((h) => h.status === 'Pending').map((pendingHosp) => (
              <div
                key={pendingHosp.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">
                      {pendingHosp.name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Dept: {pendingHosp.department || 'General Medicine'} • Requested by: {pendingHosp.requestedBy || 'Medical Staff'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Pending Admin Approval
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span>License / Registration:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{pendingHosp.licenseNumber || 'MCI-REG-VALIDATED'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Accreditation:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-sans font-semibold">{pendingHosp.accreditation || 'NABH State Accredited'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Wallet:</span>
                    <span className="text-indigo-400">{truncateHash(pendingHosp.walletAddress, 8, 6)}</span>
                  </div>
                  {pendingHosp.contactEmail && (
                    <div className="flex items-center justify-between">
                      <span>Contact Email:</span>
                      <span className="text-slate-500">{pendingHosp.contactEmail}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => handleApproveHospitalRequest(pendingHosp.id, pendingHosp.name)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Hospital</span>
                  </button>

                  <button
                    onClick={() => handleDeclineHospitalRequest(pendingHosp.id, pendingHosp.name)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Decline Application</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospital Registry Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>Approved Healthcare Provider Registry ({hospitals.filter((h) => h.status === 'Approved').length})</span>
            </h3>
            <p className="text-xs text-slate-500">Institutions authorized to issue signed records and request patient consent.</p>
          </div>

          <button
            onClick={() => setShowAddHospital(true)}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Hospital</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4">Hospital Name</th>
                <th className="py-3 px-4">Wallet Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Trust Score</th>
                <th className="py-3 px-4">Emergency Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {hospitals.filter((h) => h.status === 'Approved').map((hosp) => (
                <tr key={hosp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {hosp.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    {truncateHash(hosp.walletAddress, 8, 6)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {hosp.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-700 dark:text-teal-300 font-mono">
                    {hosp.trustScore}%
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                    {hosp.emergencyAccessCount}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRemoveHospital(hosp.id, hosp.name)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Revoke Approval"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Hospital Modal */}
      {showAddHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Register Authorized Hospital
              </h3>
              <button onClick={() => setShowAddHospital(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHospitalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institution Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metro Heart Institute"
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  EVM Wallet Address
                </label>
                <input
                  type="text"
                  value={hospWallet}
                  onChange={(e) => setHospWallet(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddHospital(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
