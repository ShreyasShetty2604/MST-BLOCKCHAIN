import React, { useState } from 'react';
import {
  Wallet, Building2, Search, QrCode, ShieldAlert, CheckCircle2, AlertTriangle,
  Clock, Plus, FileText, Send, ShieldCheck, Loader2, X, Activity, User, Lock
} from 'lucide-react';
import { PatientPersona, MedicalRecord } from '../mock/types';
import { ChainBadge } from '../components/ChainBadge';
import { TimelineItem } from '../components/TimelineItem';
import { mockApi } from '../mock/api';

interface HospitalPortalPageProps {
  onShowToast: (msg: string) => void;
}

export const HospitalPortalPage: React.FC<HospitalPortalPageProps> = ({ onShowToast }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('91-2345-6789-0123');
  const [showQrModal, setShowQrModal] = useState(false);
  const [patient, setPatient] = useState<PatientPersona | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  // Approval status states
  const [accessState, setAccessState] = useState<'none' | 'requesting' | 'approved' | 'break-glass'>('none');
  const [approvedTier, setApprovedTier] = useState<'Tier 1' | 'Tier 2'>('Tier 2');
  const [requestReason, setRequestReason] = useState('Quarterly endocrinology evaluation & HbA1c review');
  const [requestedTier, setRequestedTier] = useState<'Tier 1' | 'Tier 2'>('Tier 2');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Break glass modal states
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassCategory, setBreakGlassCategory] = useState('Acute Respiratory Distress');
  const [breakGlassNotes, setBreakGlassNotes] = useState('Patient brought in unconscious to ER bay 3.');
  const [breakGlassConfirm, setBreakGlassConfirm] = useState(false);
  const [isSubmittingBreakGlass, setIsSubmittingBreakGlass] = useState(false);

  // Add record modal states
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recTitle, setRecTitle] = useState('HbA1c & Fasting Glucose Report');
  const [recType, setRecType] = useState('Lab Report');
  const [docName, setDocName] = useState('Dr. A. R. Mehta');
  const [recSummary, setRecSummary] = useState('Glycemic parameters show steady improvement.');
  const [isSigningWallet, setIsSigningWallet] = useState(false);

  const handleConnectWallet = () => {
    setWalletConnected(true);
    onShowToast('Connected Hospital Wallet: 0x71C7...976F (City General)');
  };

  const handleSearchPatient = async (idToSearch?: string) => {
    const q = idToSearch || searchQuery;
    if (!q) return;
    const found = await mockApi.getPatientById(q);
    setPatient(found);
    setAccessState('none');
    setShowQrModal(false);
  };

  const handleSendRequest = () => {
    setIsSendingRequest(true);
    setTimeout(() => {
      setIsSendingRequest(false);
      setAccessState('approved');
      setApprovedTier(requestedTier);
      mockApi.getRecords().then(setRecords);
      onShowToast(`Patient approved ${requestedTier} access for 2 hours!`);
    }, 1500);
  };

  const handleTriggerBreakGlassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassConfirm || !patient) return;
    setIsSubmittingBreakGlass(true);

    try {
      await mockApi.triggerEmergencyBreakGlass(
        'hosp-01',
        'City General Hospital',
        breakGlassCategory,
        breakGlassNotes
      );
      setAccessState('break-glass');
      setApprovedTier('Tier 1');
      setShowBreakGlassModal(false);
      onShowToast('EMERGENCY BREAK-GLASS INVOKED! Logged on-chain with Tier 1 profile access.');
    } finally {
      setIsSubmittingBreakGlass(false);
    }
  };

  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setIsSigningWallet(true);

    try {
      const res = await mockApi.addHospitalRecord(patient.id, 'City General Hospital', {
        title: recTitle,
        recordType: recType,
        doctorName: docName,
        summary: recSummary,
        details: {
          'Fasting Blood Sugar': '118 mg/dL',
          'HbA1c': '6.9%',
          'Status': 'Optimal Glycemic Control'
        }
      });

      setShowAddRecordModal(false);
      onShowToast(`Record anchored on-chain! Tx: ${res.txHash.slice(0, 10)}... Reminder updated.`);
      const updated = await mockApi.getRecords();
      setRecords(updated);
    } finally {
      setIsSigningWallet(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 rounded-2xl text-teal-700 dark:text-teal-300">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                City General Hospital Portal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                Approved by Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Wallet: 0x71C7656EC7ab88b098defB751B7401B5f6d8976F • Polygon Amoy
            </p>
          </div>
        </div>

        <button
          onClick={handleConnectWallet}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
            walletConnected
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{walletConnected ? 'Wallet Connected (0x71C7...)' : 'Connect Hospital Wallet'}</span>
        </button>
      </div>

      {/* Search & Patient Lookup Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Patient Lookup & Triage
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Enter 14-digit MediID (e.g. 91-2345-6789-0123)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleSearchPatient()}
            className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md"
          >
            Lookup MediID
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-2"
          >
            <QrCode className="w-4 h-4 text-teal-600" />
            <span>Scan QR Code</span>
          </button>

          <button
            onClick={() => setShowBreakGlassModal(true)}
            className="px-5 py-3 rounded-2xl border-2 border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 ml-auto shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Emergency Break-Glass</span>
          </button>
        </div>
      </div>

      {/* Patient Result View */}
      {patient && (
        <div className="space-y-6 animate-fade-in">
          {/* Patient Overview Card */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white font-black text-2xl flex items-center justify-center">
                {patient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{patient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    Blood Group: {patient.emergencyInfo.bloodGroup}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  MediID: {patient.mediId} • DOB: {patient.dob}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {accessState === 'none' && (
                <div className="flex items-center gap-2">
                  <select
                    value={requestedTier}
                    onChange={(e) => setRequestedTier(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700"
                  >
                    <option value="Tier 1">Request Tier 1 (Emergency Only)</option>
                    <option value="Tier 2">Request Tier 2 (Full History)</option>
                  </select>

                  <button
                    onClick={handleSendRequest}
                    disabled={isSendingRequest}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                  >
                    {isSendingRequest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Access Request</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {accessState === 'approved' && (
                <span className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 font-bold text-xs border border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved ({approvedTier} Access Active)</span>
                </span>
              )}

              {accessState === 'break-glass' && (
                <span className="px-4 py-2 rounded-xl bg-rose-950 text-rose-200 font-bold text-xs border border-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Break-Glass Active (Tier 1 Only)</span>
                </span>
              )}
            </div>
          </div>

          {/* Persistent Red Banner if Break-Glass Active */}
          {accessState === 'break-glass' && (
            <div className="p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-glow-red flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                <span>EMERGENCY ACCESS ACTIVE — PERMANENTLY LOGGED ON POLYGON TESTNET (Tx: 0xe5f6...5682)</span>
              </div>
              <ChainBadge txHash="0xe5f6a1b2c3d47890123456789abcdef012345682" label="Audit Hash" />
            </div>
          )}

          {/* Emergency Card Display (Always Available for Triage) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              <span>Tier 1 Emergency Profile (Allergies, Conditions, Contacts)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                <span className="font-bold text-rose-800 dark:text-rose-300 block">Severe Allergies</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.emergencyInfo.allergies.map((a, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 font-bold text-rose-900 dark:text-rose-100">
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Active Conditions</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {patient.emergencyInfo.conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Current Medications</span>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {patient.emergencyInfo.medications.map((m, i) => (
                    <li key={i}><strong>{m.name}</strong> ({m.dosage})</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tier 2 Clinical History Timeline & Add Record Panel */}
          {approvedTier === 'Tier 2' && accessState === 'approved' && (
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    Tier 2 Full Clinical History
                  </h3>
                  <p className="text-xs text-slate-500">Decrypting verified patient records timeline...</p>
                </div>

                <button
                  onClick={() => setShowAddRecordModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Hospital-Verified Record</span>
                </button>
              </div>

              <div className="space-y-3">
                {records.map((rec) => (
                  <TimelineItem key={rec.id} record={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Mock Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Simulated QR Code Camera Scanner
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-64 h-64 mx-auto bg-slate-900 rounded-2xl border-2 border-dashed border-teal-500 flex items-center justify-center overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 h-1 bg-teal-400 shadow-glow-teal animate-scan-line z-20" />
              <QrCode className="w-32 h-32 text-slate-600 animate-pulse" />
            </div>

            <p className="text-xs text-slate-500">Point scanner at MediID physical card or patient app screen.</p>

            <button
              onClick={() => handleSearchPatient('91-2345-6789-0123')}
              className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md"
            >
              Simulate Instant QR Match (Rajesh Kumar)
            </button>
          </div>
        </div>
      )}

      {/* Emergency Break Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border-2 border-rose-500 space-y-5">
            <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-base">
                <ShieldAlert className="w-6 h-6" />
                <span>UNSANCTIONED EMERGENCY BREAK-GLASS</span>
              </div>
              <button onClick={() => setShowBreakGlassModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Break-glass overrides patient approval for life-threatening emergencies. Tier 1 profile will be unlocked instantly, and an immutable audit alert will be flagged on-chain.
            </p>

            <form onSubmit={handleTriggerBreakGlassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason Category
                </label>
                <select
                  value={breakGlassCategory}
                  onChange={(e) => setBreakGlassCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Acute Respiratory Distress">Acute Respiratory Distress</option>
                  <option value="Unconscious / Trauma Bay Admission">Unconscious / Trauma Bay Admission</option>
                  <option value="Severe Anaphylactic Shock">Severe Anaphylactic Shock</option>
                  <option value="Cardiac Arrest Triage">Cardiac Arrest Triage</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Notes & Doctor Justification
                </label>
                <textarea
                  rows={2}
                  value={breakGlassNotes}
                  onChange={(e) => setBreakGlassNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                <label className="flex items-start gap-2 cursor-pointer text-rose-900 dark:text-rose-200 font-bold">
                  <input
                    type="checkbox"
                    checked={breakGlassConfirm}
                    onChange={(e) => setBreakGlassConfirm(e.target.checked)}
                    required
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I understand this emergency break-glass action is permanently logged on-chain and the patient will be notified immediately.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!breakGlassConfirm || isSubmittingBreakGlass}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 shadow-md"
                >
                  {isSubmittingBreakGlass ? 'Invoking Break-Glass...' : 'Confirm Break-Glass Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Anchor Hospital-Signed Medical Record
              </h3>
              <button onClick={() => setShowAddRecordModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Report Title</label>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Lab Report">Lab Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Diagnostic Imaging">Diagnostic Imaging</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Summary Notes</label>
                <textarea
                  rows={2}
                  value={recSummary}
                  onChange={(e) => setRecSummary(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                  Cryptographic Wallet Signature Step
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Record payload will be signed with City General Hospital wallet (0x71C7...976F).
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigningWallet}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSigningWallet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing with Wallet & Anchoring...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sign & Anchor On-Chain</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
