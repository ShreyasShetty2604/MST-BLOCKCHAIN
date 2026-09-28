import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Check, Loader2, Info } from 'lucide-react';
import { truncateHash } from '../lib/formatters';

interface ChainBadgeProps {
  txHash: string;
  blockNumber?: number;
  timestamp?: string;
  label?: string;
  className?: string;
}

export const ChainBadge: React.FC<ChainBadgeProps> = ({
  txHash,
  blockNumber = 4819204,
  timestamp = '2026-08-15 11:20 AM',
  label = 'On-chain verified',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all cursor-pointer font-mono group ${className}`}
        title="Click to view blockchain verification details"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
        <span>{label}</span>
        <span className="opacity-75 font-mono text-[11px]">({truncateHash(txHash)})</span>
      </button>

      {/* Side Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 overflow-y-auto animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Blockchain Audit Trail</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Immutable Polygon Amoy Verification</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-6 space-y-4">
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">Transaction Status</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3" /> Confirmed (128 Block Confirmations)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  This record signature was anchored on-chain with cryptographic proof. Patient payload data remains encrypted off-chain.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-sans">Transaction Hash</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-slate-900 dark:text-slate-100 font-mono break-all text-[11px]">{txHash}</span>
                    <button
                      onClick={handleCopy}
                      className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded shrink-0 font-sans text-[11px]"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-sans">Block Number</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold mt-1 block">#{blockNumber}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-sans">Network</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold mt-1 block">Polygon Amoy</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-sans">Timestamp</span>
                  <span className="text-slate-900 dark:text-slate-100 font-semibold mt-1 block font-sans">{timestamp}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <span>
                  MediVault stores zero personal health data (PHI) on the public blockchain. Only salted SHA-256 integrity hashes are committed.
                </span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
              <a
                href={`https://amoy.polygonscan.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md transition-colors"
              >
                <span>View on PolygonScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PendingChainChip: React.FC<{ isConfirmed?: boolean; txHash?: string }> = ({
  isConfirmed = false,
  txHash = '0x3f2a...9c1d'
}) => {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
      isConfirmed
        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
    }`}>
      {isConfirmed ? (
        <>
          <span className="flex h-2 w-2 relative">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Confirmed on-chain ({txHash})</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
          <span>Pending on-chain verification...</span>
        </>
      )}
    </div>
  );
};
