import React, { useState, useEffect } from 'react';
import {
  ClipboardList, ShieldCheck, Filter, ShieldAlert
} from 'lucide-react';
import { AuditLog } from '../../mock/types';
import { AuditLogRow } from '../../components/AuditLogRow';
import { mockApi } from '../../mock/api';

export const AuditTrailTab: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const loadData = async () => {
    const a = await mockApi.getAuditLogs();
    setAuditLogs(a);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFlagAudit = async (auditId: string, reason: string) => {
    await mockApi.flagAuditLog(auditId, reason);
    await loadData();
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'Emergency') return log.isEmergency;
    if (selectedFilter === 'Consents') return log.eventType.includes('Consent');
    if (selectedFilter === 'AI Read') return log.eventType === 'AI Read';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Immutable On-Chain Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every access event, AI read, consent grant, or emergency break-glass log is anchored on-chain.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {['All', 'Emergency', 'Consents', 'AI Read'].map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFilter(f)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                selectedFilter === f
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Log rows */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-3">
        {filteredLogs.map((log) => (
          <AuditLogRow key={log.id} log={log} onFlag={handleFlagAudit} />
        ))}
      </div>
    </div>
  );
};
