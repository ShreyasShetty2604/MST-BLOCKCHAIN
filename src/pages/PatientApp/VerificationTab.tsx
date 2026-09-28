import React, { useState, useEffect } from 'react';
import {
  BadgeCheck, ShieldCheck, CheckCircle2, AlertTriangle, Loader2, Stethoscope, FileCheck, RefreshCw
} from 'lucide-react';
import { IntegrityResult, MedicalRecord } from '../../mock/types';
import { mockApi } from '../../mock/api';
import { ChainBadge } from '../../components/ChainBadge';

export const VerificationTab: React.FC = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<IntegrityResult[] | null>(null);

  const loadData = async () => {
    const r = await mockApi.getRecords();
    setRecords(r);
  };

  useEffect(() => {
    loadData();
  }, []);

  const clinicians = Array.from(new Map(
    records.filter((record) => record.doctor).map((record) => [record.doctor!, { name: record.doctor!, hospital: record.source }])
  ).values());

  const handleRunVerification = async () => {
    setIsScanning(true);
    try {
      const results = await mockApi.runFullIntegrityScan();
      setScanResults(results);
      await loadData();
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Document & Doctor Verification
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent cryptographic proof of record integrity and clinician credentials.
          </p>
        </div>

        <button
          onClick={handleRunVerification}
          disabled={isScanning}
          className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying On-Chain Hashes...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Run Verification Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Verified Doctors */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span>Verified Clinicians on File</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clinicians.length === 0 ? (
            <p className="text-xs text-slate-500">No clinician-issued records are available in this vault.</p>
          ) : clinicians.map((doc) => (
            <div
              key={doc.name}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {doc.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Verified Doctor</span>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 block mt-0.5">
                    Issuer on canonical records • {doc.hospital}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span>Source:</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400">Canonical Medical Records</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Integrity Scan Results */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-teal-600" />
          <span>Canonical Document Hashes & State</span>
        </h2>

        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {rec.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    {rec.date}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Issuer: {rec.doctor || 'Not recorded'} ({rec.source})
                </span>
                <span className="font-mono text-[10px] text-slate-400 block">
                  SHA-256 Hash: {rec.hash}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{rec.status === 'verified' ? 'Unmodified & Verified' : rec.status}</span>
                </span>
                <ChainBadge txHash={rec.txHash} label="Block Audit" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
