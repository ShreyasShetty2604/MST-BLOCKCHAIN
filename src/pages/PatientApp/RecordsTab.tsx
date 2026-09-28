import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, ShieldCheck, Filter, Loader2, CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import { MedicalRecord, RecordCategory, IntegrityResult } from '../../mock/types';
import { TimelineItem } from '../../components/TimelineItem';
import { mockApi } from '../../mock/api';

export const RecordsTab: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RecordCategory | 'All'>('All');
  const [loading, setLoading] = useState(true);

  // Full integrity scan state
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanResults, setScanResults] = useState<IntegrityResult[] | null>(null);

  // Add self-declared modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('Allergy Log');
  const [summary, setSummary] = useState('');
  const [detailKey, setDetailKey] = useState('Symptom Notes');
  const [detailVal, setDetailVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await mockApi.getRecords(selectedCategory);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selectedCategory]);

  const handleRunFullScan = async () => {
    setIsScanningAll(true);
    setScanResults(null);
    try {
      const results = await mockApi.runFullIntegrityScan();
      setScanResults(results);
      await loadRecords();
    } finally {
      setIsScanningAll(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !summary) return;
    setIsSubmitting(true);
    try {
      await mockApi.addSelfDeclaredRecord({
        title,
        recordType,
        summary,
        details: { [detailKey]: detailVal || 'Patient reported entry' }
      });
      setIsAddOpen(false);
      setTitle('');
      setSummary('');
      setDetailVal('');
      await loadRecords();
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: (RecordCategory | 'All')[] = [
    'All',
    'Prescriptions',
    'Reports',
    'Self-declared',
    'Hospital-verified',
    'Vaccinations'
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Scan Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Medical Records Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Anchored on Polygon testnet with zero unencrypted health data on-chain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunFullScan}
            disabled={isScanningAll}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isScanningAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning 100% Records...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Run Full Integrity Scan</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Self-Declared Record</span>
          </button>
        </div>
      </div>

      {/* Full Scan Progress / Results Banner */}
      {scanResults && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>Full Vault Cryptographic Audit Report</span>
            </div>
            <button
              onClick={() => setScanResults(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Close Report
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto text-xs pr-1">
            {scanResults.map((res) => (
              <div
                key={res.recordId}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  res.status === 'verified'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 text-rose-900 dark:text-rose-200 font-bold animate-pulse'
                }`}
              >
                <div className="flex items-center gap-2">
                  {res.status === 'verified' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>{res.title}</span>
                </div>
                <span className="font-mono text-[10px]">
                  {res.status === 'verified' ? 'SHA-256 Valid' : 'TAMPERED HASH MISMATCH'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-teal-500'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Records Timeline */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" />
          <p className="text-xs">Decrypting timeline records from local vault...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No records found</p>
          <p className="text-xs text-slate-500">Add a self-declared record or request your hospital to anchor a report.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => (
            <TimelineItem key={rec.id} record={rec} onRefresh={loadRecords} />
          ))}
        </div>
      )}

      {/* Add Self-Declared Record Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Add Self-Declared Record
              </h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
              Note: Self-declared records are marked with a yellow badge so doctors can distinguish patient logs from hospital-signed reports.
            </p>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Morning Fasting Glucose Check');
                    setRecordType('Vital Signs');
                    setSummary('Routine home glucometer check before breakfast.');
                    setDetailKey('Blood Glucose');
                    setDetailVal('112 mg/dL');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                >
                  Glucose Log
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Home Blood Pressure Reading');
                    setRecordType('Vital Signs');
                    setSummary('Evening seated blood pressure reading using digital cuff.');
                    setDetailKey('Blood Pressure');
                    setDetailVal('122/80 mmHg (Pulse: 72 bpm)');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                >
                  BP Check
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitle('Mild Peanut Allergy Reaction');
                    setRecordType('Allergy Log');
                    setSummary('Developed mild itchy hives on forearm after accidental peanut trace exposure.');
                    setDetailKey('Reaction Severity');
                    setDetailVal('Grade 1 Mild - Resolved with Cetirizine 10mg');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                >
                  Allergy Incident
                </button>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Self-Reported Penicillin Allergy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Record Type</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Allergy Log">Allergy Log</option>
                  <option value="Medication Log">Medication Log</option>
                  <option value="Symptom Journal">Symptom Journal</option>
                  <option value="Vital Signs">Vital Signs</option>
                  <option value="Condition Declaration">Condition Declaration</option>
                  <option value="Blood Group Declaration">Blood Group Declaration</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Mild rash observed after taking Amoxicillin in 2019."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Detail Key</label>
                  <input
                    type="text"
                    value={detailKey}
                    onChange={(e) => setDetailKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Detail Value</label>
                  <input
                    type="text"
                    placeholder="e.g. Moderate Hives"
                    value={detailVal}
                    onChange={(e) => setDetailVal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/60 rounded-xl border border-teal-200 dark:border-teal-900 text-[11px] text-teal-900 dark:text-teal-200">
                🔒 Protected by AES-256-GCM authenticated encryption. SHA-256 integrity hash is anchored directly on Polygon Amoy.
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Anchoring On-Chain...' : 'Anchor Self-Declared Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
