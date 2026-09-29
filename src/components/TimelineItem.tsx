import React, { useState } from 'react';
import {
  FileText, Activity, Pill, Syringe, UserCheck, ChevronDown, ChevronUp,
  ShieldCheck, Loader2, GitCompare, FileCode, CheckCircle2, AlertTriangle, Download
} from 'lucide-react';
import { MedicalRecord, IntegrityResult } from '../mock/types';
import { ChainBadge } from './ChainBadge';
import { VerifiedBadge, SelfDeclaredBadge, TamperAlertBadge } from './RecordBadges';
import { mockApi } from '../mock/api';
import { formatDate } from '../lib/formatters';

interface TimelineItemProps {
  record: MedicalRecord;
  onRefresh?: () => void;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ record, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Prescriptions':
        return <Pill className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'Reports':
        return <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Vaccinations':
        return <Syringe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'Self-declared':
        return <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    }
  };

  const handleVerifyIntegrity = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVerifying(true);
    setIntegrityResult(null);

    try {
      const res = await mockApi.verifyRecordIntegrity(record.id);
      setIntegrityResult(res);
      if (onRefresh) onRefresh();
    } finally {
      setIsVerifying(false);
    }
  };

  const isTampered = record.status === 'tampered' || (integrityResult && integrityResult.status === 'tampered');

  return (
    <div className={`relative pl-8 pb-8 group ${isTampered ? 'animate-pulse-glow' : ''}`}>
      {/* Timeline Line */}
      <div className="absolute left-[15px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 group-last:hidden" />

      {/* Timeline Bullet Icon */}
      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-sm ${
        isTampered
          ? 'bg-rose-100 border-rose-500 dark:bg-rose-950 dark:border-rose-500'
          : record.sourceType === 'hospital'
          ? 'bg-teal-50 border-teal-500 dark:bg-teal-950 dark:border-teal-400'
          : 'bg-amber-50 border-amber-500 dark:bg-amber-950 dark:border-amber-400'
      }`}>
        {getCategoryIcon(record.category)}
      </div>

      {/* Card Content */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        isTampered
          ? 'border-rose-500/50 bg-rose-950/40'
          : 'glass-panel hover:border-emerald-400/50'
      }`}>
        <div
          className="p-5 cursor-pointer select-none space-y-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {formatDate(record.date)}
              </span>
              {record.version > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDiff(!showDiff);
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 hover:bg-indigo-200"
                  title="View version history diff"
                >
                  <GitCompare className="w-3 h-3" />
                  <span>v{record.version}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isTampered ? (
                <TamperAlertBadge />
              ) : record.sourceType === 'hospital' ? (
                <VerifiedBadge />
              ) : (
                <SelfDeclaredBadge />
              )}
              <ChainBadge txHash={record.txHash} blockNumber={record.blockNumber} />
            </div>
          </div>

          {/* Title and Source */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {record.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>Source: <strong className="text-slate-700 dark:text-slate-300">{record.source}</strong></span>
                {record.doctor && <span>• Doctor: <strong>{record.doctor}</strong></span>}
              </p>
            </div>

            <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Brief Summary */}
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
            {record.payload.summary}
          </p>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4 animate-fade-in">
            {/* Key-Value Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(record.payload.details).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-mono">{key}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">{val}</span>
                </div>
              ))}
            </div>

            {/* Attachments */}
            {record.payload.attachments && record.payload.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attachments</span>
                {record.payload.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{att.name}</span>
                      <span className="text-slate-400 text-[10px]">({att.size})</span>
                    </div>
                    <button className="p-1 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950 rounded" title="Download encrypted copy">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Signature & Cryptographic Hash */}
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
              {record.payload.signedBy && (
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <span>Digital Signature:</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300">{record.payload.signedBy}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Payload SHA-256 Hash:</span>
                <span className="truncate max-w-[200px] text-slate-700 dark:text-slate-300">{record.hash}</span>
              </div>
            </div>

            {/* Integrity Verification Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-medium text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Computing Hash & Comparing On-Chain...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Record Integrity</span>
                  </>
                )}
              </button>
            </div>

            {/* Integrity Result Card */}
            {integrityResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fade-in ${
                integrityResult.status === 'verified'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {integrityResult.status === 'verified' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                    <span>
                      {integrityResult.status === 'verified'
                        ? 'CRYPTOGRAPHIC INTEGRITY VERIFIED (100% MATCH)'
                        : 'TAMPER DETECTED - SHA-256 HASH MISMATCH'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono opacity-75">
                    {new Date(integrityResult.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[11px] pt-1">
                  <div>
                    <span className="opacity-75 block text-[10px] uppercase">On-Chain Expected Hash:</span>
                    <span className="break-all">{integrityResult.expectedHash}</span>
                  </div>
                  <div>
                    <span className="opacity-75 block text-[10px] uppercase">Client Computed Hash:</span>
                    <span className={`break-all ${integrityResult.status === 'tampered' ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
                      {integrityResult.computedHash}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Version History Diff View */}
            {showDiff && record.diffSummary && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800 pb-2">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold text-xs">
                    <GitCompare className="w-4 h-4 text-indigo-600" />
                    <span>Version History Diff: v1 → v2</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300">
                    Previous Hash: {record.previousVersionHash?.slice(0, 10)}...
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {record.diffSummary.map((diff, idx) => (
                    <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900">
                      <span className="text-[10px] text-indigo-800 dark:text-indigo-300 font-semibold uppercase">{diff.field}</span>
                      <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
                        <div className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-900 line-through">
                          - {diff.oldValue}
                        </div>
                        <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900 font-bold">
                          + {diff.newValue}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
