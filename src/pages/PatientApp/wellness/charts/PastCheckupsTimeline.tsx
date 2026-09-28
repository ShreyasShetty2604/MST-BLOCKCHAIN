import React from 'react';
import { MedicalRecord } from '../../../../mock/types';
import { ChainBadge } from '../../../../components/ChainBadge';

// Vertical timeline of past checkups (hospital reports & scans from the Records page), newest first.
export const PastCheckupsTimeline: React.FC<{ records: MedicalRecord[] }> = ({ records }) => {
  const past = records
    .filter((r) => r.sourceType === 'hospital' && /report|imaging|test|screen|diagnostic/i.test(`${r.recordType} ${r.category}`))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (past.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">No past checkups on record yet.</p>;

  return (
    <ol className="relative">
      {past.map((r, i) => {
        const verified = r.status === 'verified' && !r.tamperedHash;
        return (
          <li key={r.id} className="relative pl-8 pb-6 last:pb-0">
            {i < past.length - 1 && <span aria-hidden className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />}
            <span
              aria-hidden
              className={`absolute left-0 top-1 w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                verified ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(`${r.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {r.source}
                </p>
              </div>
              {verified && <ChainBadge tone="teal" txHash={r.txHash} label="Verified on-chain" />}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
