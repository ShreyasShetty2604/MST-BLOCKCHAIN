import React, { useState, useEffect } from 'react';
import {
  KeyRound, Building2, ShieldCheck, Clock, Fingerprint, RefreshCw, CheckCircle2, X, Filter
} from 'lucide-react';
import { Consent, AuditLog, IncomingAccessRequest } from '../../mock/types';
import { ConsentCard } from '../../components/ConsentCard';
import { AuditLogRow } from '../../components/AuditLogRow';
import { PendingChainChip } from '../../components/ChainBadge';
import { mockApi } from '../../mock/api';

export const AccessTab: React.FC = () => {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingAccessRequest[]>([]);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState<string>('All');

  // Approval Modal State
  const [selectedRequest, setSelectedRequest] = useState<IncomingAccessRequest | null>(null);
  const [selectedTier, setSelectedTier] = useState<'Tier 1' | 'Tier 2'>('Tier 2');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [isScanningBiometric, setIsScanningBiometric] = useState(false);
  const [approvalConfirmedTx, setApprovalConfirmedTx] = useState<string | null>(null);

  const loadData = async () => {
    const c = await mockApi.getConsents();
    const a = await mockApi.getAuditLogs();
    const reqs = await mockApi.getIncomingRequests();
    setConsents(c);
    setAuditLogs(a);
    setIncomingRequests(reqs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeConsent = async (consentId: string) => {
    await mockApi.revokeConsent(consentId);
    await loadData();
  };

  const handleFlagAudit = async (auditId: string, reason: string) => {
    await mockApi.flagAuditLog(auditId, reason);
    await loadData();
  };

  const handleStartApprovalPasskey = async () => {
    if (!selectedRequest) return;
    setIsScanningBiometric(true);

    setTimeout(async () => {
      const res = await mockApi.grantConsent({
        hospitalId: selectedRequest.hospitalId,
        hospitalName: selectedRequest.hospitalName,
        tier: selectedTier,
        durationHours,
        reason: selectedRequest.reason
      });

      setIsScanningBiometric(false);
      setApprovalConfirmedTx(res.txHash);
      await loadData();
    }, 2000);
  };

  const filteredLogs = auditLogs.filter((l) => {
    if (selectedAuditFilter === 'All') return true;
    if (selectedAuditFilter === 'Emergency') return l.isEmergency;
    if (selectedAuditFilter === 'Consents') return l.eventType.includes('Consent');
    if (selectedAuditFilter === 'AI Read') return l.eventType === 'AI Read';
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Consent & Audit Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Control hospital access permissions in real-time and review immutable access logs.
        </p>
      </div>

      {/* INCOMING ACCESS REQUEST BANNER / CARDS */}
      {incomingRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Pending Access Requests ({incomingRequests.length})
            </h2>
          </div>

          <div className="space-y-3">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-card flex flex-wrap items-center justify-between gap-4 animate-fade-in"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {req.hospitalName}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        Requested: {req.requestedTier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Reason: {req.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setSelectedTier(req.requestedTier);
                      setApprovalConfirmedTx(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all"
                  >
                    Review & Grant Consent
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE CONSENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600" />
            <span>Active Hospital Permissions ({consents.filter((c) => c.status === 'active').length})</span>
          </h2>
        </div>

        {consents.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No active consents granted.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consents.map((cons) => (
              <ConsentCard key={cons.id} consent={cons} onRevoke={handleRevokeConsent} />
            ))}
          </div>
        )}
      </div>

      {/* FULL AUDIT LOG TABLE / TIMELINE */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Immutable On-Chain Audit Ledger</span>
            </h2>
            <p className="text-xs text-slate-500">
              Every access event, AI read, consent grant, or emergency break-glass log is anchored on-chain.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            {['All', 'Emergency', 'Consents', 'AI Read'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedAuditFilter(f)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  selectedAuditFilter === f
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <AuditLogRow key={log.id} log={log} onFlag={handleFlagAudit} />
          ))}
        </div>
      </div>

      {/* CONSENT APPROVAL SHEET MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 uppercase">
                  Grant Access Consent
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {selectedRequest.hospitalName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!approvalConfirmedTx ? (
              <div className="space-y-5 text-xs">
                {/* Tier Selection */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    1. Select Data Access Tier
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTier('Tier 1')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedTier === 'Tier 1'
                          ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span className="block font-bold text-sm">Tier 1</span>
                      <span className="text-[10px] block mt-1">
                        Emergency Card Only (Blood group, allergies, active conditions, emergency contact)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTier('Tier 2')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedTier === 'Tier 2'
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-900 dark:text-indigo-100 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <span className="block font-bold text-sm">Tier 2</span>
                      <span className="text-[10px] block mt-1">
                        Full Clinical History Access (Prescriptions, lab reports, vaccinations, timeline)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Duration Selection */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>2. Select Access Duration</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 24, 168].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setDurationHours(h)}
                        className={`py-2 rounded-xl border text-center font-semibold transition-all ${
                          durationHours === h
                            ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {h === 168 ? '7 Days' : `${h} Hours`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fingerprint Passkey Confirmation Step */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    3. Sign On-Chain Permission with Fingerprint
                  </span>

                  <button
                    type="button"
                    onClick={handleStartApprovalPasskey}
                    disabled={isScanningBiometric}
                    className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isScanningBiometric ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Hardware Passkey...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-4 h-4 text-teal-200" />
                        <span>Confirm & Sign Consent On-Chain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg">
                  Consent Granted & Anchored!
                </h4>
                <p className="text-xs text-slate-500">
                  {selectedRequest.hospitalName} has been granted {selectedTier} access for {durationHours}h.
                </p>

                <PendingChainChip isConfirmed={true} txHash={approvalConfirmedTx} />

                <div className="pt-3">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs"
                  >
                    Close Modal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
