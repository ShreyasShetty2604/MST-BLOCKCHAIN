import React, { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Download, FileText, Filter, Loader2, Search, ShieldCheck, X } from 'lucide-react';
import { MedicalRecord } from '../mock/types';
import { mockApi } from '../mock/api';
import { formatDate } from '../lib/formatters';

interface RecentReportsModalProps {
  patientName?: string;
  onClose: () => void;
}

const reportStatus = (record: MedicalRecord) => record.status === 'verified' ? 'Verified' : record.status === 'pending' ? 'Pending' : 'Expired';

export const RecentReportsModal: React.FC<RecentReportsModalProps> = ({ patientName = 'Patient', onClose }) => {
  const [reports, setReports] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [doctor, setDoctor] = useState('All');
  const [status, setStatus] = useState('All');
  const [dateOrder, setDateOrder] = useState<'newest' | 'oldest'>('newest');
  const [selected, setSelected] = useState<MedicalRecord | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);

  const loadReports = async (isMounted: () => boolean = () => true) => {
    setLoading(true); setError(false);
    try {
      const data = await mockApi.getRecords('Reports');
      if (isMounted()) {
        setReports(data.sort((a, b) => b.date.localeCompare(a.date)));
      }
    } catch (loadError) {
      if (isMounted()) {
        console.error('Unable to load recent reports', loadError);
        setError(true);
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialReports = async () => {
      await loadReports(() => mounted);
    };

    loadInitialReports();

    return () => {
      mounted = false;
    };
  }, []);

  const reportTypes = useMemo(() => ['All', ...Array.from(new Set(reports.map(r => r.recordType)))], [reports]);
  const doctors = useMemo(() => ['All', ...Array.from(new Set(reports.map(r => r.doctor).filter(Boolean) as string[]))], [reports]);
  const filtered = useMemo(() => reports.filter(report => {
    const haystack = `${report.title} ${report.recordType} ${report.doctor || ''}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (type === 'All' || report.recordType === type) && (doctor === 'All' || report.doctor === doctor) && (status === 'All' || reportStatus(report) === status);
  }).sort((a, b) => dateOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)), [reports, query, type, doctor, status, dateOrder]);

  const downloadReport = (report: MedicalRecord) => {
    const content = [`MediVault Medical Report`, `Patient: ${patientName}`, `Report: ${report.title}`, `Type: ${report.recordType}`, `Date: ${formatDate(report.date)}`, `Doctor: ${report.doctor || 'Not recorded'}`, `Hospital: ${report.source}`, '', 'Recorded results:', ...Object.entries(report.payload.details).map(([key, value]) => `${key}: ${value}`), '', `Document hash: ${report.hash}`, `Status: ${reportStatus(report)}`].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    link.download = `${report.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.txt`;
    link.click(); URL.revokeObjectURL(link.href);
  };

  const verify = async (record: MedicalRecord) => {
    setVerifyingId(record.id); setVerifiedId(null);
    try { const result = await mockApi.verifyRecordIntegrity(record.id); if (result.status === 'verified') setVerifiedId(record.id); }
    finally { setVerifyingId(null); }
  };

  return <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 animate-fade-in">
    <div className="max-w-6xl mx-auto min-h-full bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Activity className="w-6 h-6 text-teal-600" /><h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Recent Reports</h1></div><p className="text-xs text-slate-500 mt-1">Newest medical reports from your MediVault record collection.</p></div>
        <button onClick={onClose} aria-label="Close recent reports" className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
      </header>

      <section className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <label className="sm:col-span-2 lg:col-span-1 relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reports" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" /></label>
        <select value={type} onChange={e => setType(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">{reportTypes.map(value => <option key={value}>{value}</option>)}</select>
        <select value={doctor} onChange={e => setDoctor(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">{doctors.map(value => <option key={value}>{value}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"><option>All</option><option>Verified</option><option>Pending</option><option>Expired</option></select>
        <button onClick={() => setDateOrder(value => value === 'newest' ? 'oldest' : 'newest')} className="px-3 py-2.5 rounded-xl border border-teal-200 text-teal-700 dark:text-teal-300 text-xs font-semibold flex items-center justify-center gap-1"><Filter className="w-3.5 h-3.5" />{dateOrder === 'newest' ? 'Newest first' : 'Oldest first'}</button>
      </section>

      {loading ? <div className="py-20 text-center text-slate-500 text-xs"><Loader2 className="w-7 h-7 animate-spin text-teal-600 mx-auto mb-2" />Loading reports...</div> : error ? <div className="py-16 text-center"><p className="font-bold text-slate-700 dark:text-slate-300">Unable to load reports. Please try again.</p><button onClick={() => loadReports()} className="mt-3 text-xs font-bold text-teal-700">Retry</button></div> : filtered.length === 0 ? <div className="py-16 text-center text-slate-500"><FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" /><p className="font-bold text-sm">No recent reports found.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map(report => <article key={report.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <div className="flex justify-between gap-3"><div><span className="text-[10px] font-mono text-teal-700 dark:text-teal-300">{report.recordType}</span><h2 className="font-bold text-slate-900 dark:text-white mt-1">{report.title}</h2></div><span className={`shrink-0 px-2 py-1 h-fit rounded-full text-[10px] font-bold ${reportStatus(report) === 'Verified' ? 'bg-emerald-100 text-emerald-700' : reportStatus(report) === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{reportStatus(report)}</span></div>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1"><p><b>Report date:</b> {formatDate(report.date)}</p><p><b>Doctor:</b> {report.doctor || 'Not recorded'}</p><p><b>Hospital:</b> {report.source}</p><p><b>Uploaded:</b> {formatDate(report.date)}</p></div>
        <div className="grid grid-cols-2 gap-2"><button onClick={() => setSelected(report)} className="py-2 rounded-xl bg-teal-700 text-white text-xs font-bold">View Report</button><button onClick={() => downloadReport(report)} className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" />Download</button></div>
      </article>)}</div>}

      {selected && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70"><div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"><div className="flex justify-between gap-3"><div><span className="text-[10px] font-mono text-teal-600">REPORT DETAILS</span><h2 className="font-bold text-lg text-slate-900 dark:text-white">{selected.title}</h2></div><button onClick={() => setSelected(null)} className="text-slate-400"><X /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"><p><b>Patient:</b> {patientName}</p><p><b>Date:</b> {formatDate(selected.date)}</p><p><b>Doctor:</b> {selected.doctor || 'Not recorded'}</p><p><b>Hospital:</b> {selected.source}</p><p><b>Type:</b> {selected.recordType}</p><p><b>Status:</b> {reportStatus(selected)}</p></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{Object.entries(selected.payload.details).map(([key, value]) => <div key={key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"><span className="block text-[10px] uppercase text-slate-400">{key}</span><b>{value}</b></div>)}</div><div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"><b>Blockchain/document verification</b><p className="mt-1 font-mono break-all text-[10px]">Hash: {selected.hash}</p><p className="font-mono text-[10px]">Transaction: {selected.txHash}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => verify(selected)} disabled={verifyingId === selected.id} className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold flex gap-2 items-center">{verifyingId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}Verify Document</button><button onClick={() => downloadReport(selected)} className="px-4 py-2 rounded-xl border text-xs font-bold">Download</button>{verifiedId === selected.id && <span className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Integrity verified</span>}</div></div></div>}
    </div>
  </div>;
};
