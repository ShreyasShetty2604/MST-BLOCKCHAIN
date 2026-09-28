import React from 'react';
import { Bell, CalendarCheck } from 'lucide-react';
import { MedicalRecord } from '../../../mock/types';
import { ChainBadge } from '../../../components/ChainBadge';
import { DerivedCheckup } from '../../../features/nutrition/recordInsights';
import { Card, Label, SectionTitle, IconTile, GhostButton, Skeleton } from './ui';
import { DueStatus } from './shared';
import { CheckupRing } from './charts/CheckupRing';
import { PastCheckupsTimeline } from './charts/PastCheckupsTimeline';

interface CheckupsViewProps {
  checkups: DerivedCheckup[] | null;
  records: MedicalRecord[] | null;
  onTestReminder: () => void;
}

export const CheckupsView: React.FC<CheckupsViewProps> = ({ checkups, records, onTestReminder }) => (
  <div className="space-y-8">
  <section className="space-y-4">
    <SectionTitle
      title="Checkups"
      subtitle="Scheduled from the dates of your reports on the Records page"
      action={
        <GhostButton icon={Bell} onClick={onTestReminder}>
          Test reminder
        </GhostButton>
      }
    />

    {checkups === null ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="space-y-4">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    ) : checkups.length === 0 ? (
      <Card className="flex items-center gap-4">
        <IconTile icon={CalendarCheck} />
        <p className="text-sm text-slate-500 dark:text-slate-400">No checkups are needed for your current conditions.</p>
      </Card>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {checkups.map((c) => (
          <Card key={c.id} interactive className="h-full flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4 min-w-0">
                <CheckupRing checkup={c} />
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{c.title}</h3>
                  <Label>{c.intervalLabel}</Label>
                </div>
              </div>
              <DueStatus checkup={c} />
            </div>

            <dl className="grid grid-cols-2 gap-4 flex-1">
              <div>
                <dt>
                  <Label>Last report</Label>
                </dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white">{c.lastDoneDate}</dd>
              </div>
              <div>
                <dt>
                  <Label>Next due</Label>
                </dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white">{c.dueDate}</dd>
              </div>
            </dl>

            {c.basedOn && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Label className="truncate">From: {c.basedOn}</Label>
                {c.hospitalVerified && c.txHash && <ChainBadge tone="teal" txHash={c.txHash} label="Verified" />}
              </div>
            )}
          </Card>
        ))}
      </div>
    )}
  </section>

  <section className="space-y-4">
    <SectionTitle title="Past checkups" subtitle="From your Records, newest first" />
    <Card>{records === null ? <Skeleton className="h-32 w-full" /> : <PastCheckupsTimeline records={records} />}</Card>
  </section>
  </div>
);