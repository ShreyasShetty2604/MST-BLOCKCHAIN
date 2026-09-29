import React, { useState, useEffect } from 'react';
import { Building2, Clock, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { Consent } from '../mock/types';
import { ChainBadge } from './ChainBadge';

interface ConsentCardProps {
  consent: Consent;
  onRevoke: (consentId: string) => Promise<void>;
}

export const ConsentCard: React.FC<ConsentCardProps> = ({ consent, onRevoke }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(consent.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0 || consent.status !== 'active') {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [consent.expiresAt, consent.status]);

  const handleRevokeClick = async () => {
    setIsRevoking(true);
    try {
      await onRevoke(consent.id);
    } finally {
      setIsRevoking(false);
      setIsConfirming(false);
    }
  };

  const isTier2 = consent.tier === 'Tier 2';

  return (
    <div className="p-5 rounded-2xl glass-panel space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-900/50 rounded-xl text-emerald-400 border border-emerald-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">
              {consent.hospitalName}
            </h3>
            <p className="text-xs text-emerald-200/70 mt-0.5">
              Reason: {consent.reason}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
            isTier2
              ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }`}
        >
          {consent.tier} ({consent.tierLabel})
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
            {timeLeft}
          </span>
        </div>

        <ChainBadge txHash={consent.txHash} label="Permission Anchored" />
      </div>

      {consent.status === 'active' && (
        <div className="pt-2">
          {!isConfirming ? (
            <button
              onClick={() => setIsConfirming(true)}
              className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Revoke Access Now</span>
            </button>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Confirm Revocation?</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Revoking access takes effect on-chain immediately. The hospital will no longer be able to decrypt your records.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleRevokeClick}
                  disabled={isRevoking}
                  className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  {isRevoking ? 'Revoking on-chain...' : 'Yes, Revoke Access'}
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {consent.status === 'revoked' && (
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-slate-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rose-500" />
          <span>Access Revoked On-Chain</span>
        </div>
      )}
    </div>
  );
};
