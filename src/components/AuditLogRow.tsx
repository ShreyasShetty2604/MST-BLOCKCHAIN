import React, { useState } from 'react';
import {
  ShieldAlert, Eye, Bot, Key, FilePlus, ShieldCheck, Flag, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { AuditLog } from '../mock/types';
import { ChainBadge } from './ChainBadge';

interface AuditLogRowProps {
  log: AuditLog;
  onFlag: (auditId: string, reason: string) => Promise<void>;
}

export const AuditLogRow: React.FC<AuditLogRowProps> = ({ log, onFlag }) => {
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getEventIcon = () => {
    switch (log.eventType) {
      case 'Emergency Access':
        return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Access':
        return <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'AI Read':
        return <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Consent Granted':
      case 'Consent Revoked':
        return <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'Record Added':
        return <FilePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Integrity Check':
        return <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Eye className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleFlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagReason) return;
    setIsSubmitting(true);
    try {
      await onFlag(log.id, flagReason);
    } finally {
      setIsSubmitting(false);
      setIsFlagging(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all space-y-3 ${
        log.isEmergency
          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-lg ${
              log.isEmergency
                ? 'bg-rose-100 dark:bg-rose-900/60'
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {getEventIcon()}
          </div>
          <div>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                log.isEmergency
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {log.eventType}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono ml-2">
              {log.timestamp}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {log.isFlagged && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Flagged as Misuse
            </span>
          )}
          <ChainBadge txHash={log.txHash} blockNumber={log.blockNumber} />
        </div>
      </div>

      <div className="text-xs space-y-1">
        <p className="font-semibold text-slate-900 dark:text-white">
          {log.actor}
        </p>
        <p className="text-slate-600 dark:text-slate-300">{log.action}</p>
      </div>

      {log.isEmergency && !log.isFlagged && (
        <div className="pt-2 border-t border-rose-200 dark:border-rose-900/50">
          {!isFlagging ? (
            <button
              onClick={() => setIsFlagging(true)}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Flag as Misuse / Unauthorized Access</span>
            </button>
          ) : (
            <form onSubmit={handleFlagSubmit} className="space-y-2 animate-fade-in pt-1">
              <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
                Report Emergency Access Misuse to Hospital Compliance & Admin:
              </p>
              <input
                type="text"
                placeholder="Reason for flag (e.g. Was not at hospital during this time)"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Flag...' : 'Submit Flag On-Chain'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlagging(false)}
                  className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {log.isFlagged && log.flagReason && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg border border-amber-200 dark:border-amber-900 font-mono">
          Flag Note: {log.flagReason}
        </p>
      )}
    </div>
  );
};
