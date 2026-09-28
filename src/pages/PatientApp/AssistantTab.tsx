import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, Sparkles, FileText, Share2, BadgeCheck, ShieldCheck,
  Search, Clock, CheckCircle2, ExternalLink, X
} from 'lucide-react';
import { PatientPersona } from '../../mock/types';
import {
  DEMO_RECORDS, DEMO_DOCTORS, DEMO_CONSENTS, DEMO_PATIENT,
  getRecordsSortedByDate, getMedicinesFromRecords, getActiveConsentsForDoctor,
  getDoctorByName, searchRecords, MedProofRecord
} from '../../mock/medproofData';

// ─── Types ─────────────────────────────────────────────────
interface Source {
  recordId: string;
  title: string;
  date: string;
}

interface Verification {
  doctorVerified?: boolean;
  documentHashVerified?: boolean;
  timestampVerified?: boolean;
  documentUnmodified?: boolean;
}

interface ShareCard {
  document: string;
  recipient: string;
  recipientVerified: boolean;
  duration: string;
}

interface ComparisonRow {
  test: string;
  january: string;
  september: string;
  change: string;
}

interface AccessEntry {
  recordTitle: string;
  status: string;
  expiresAt: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: Source[];
  verification?: Verification;
  shareCard?: ShareCard;
  comparisonTable?: ComparisonRow[];
  accessList?: AccessEntry[];
  timelineEntries?: { date: string; title: string; doctor: string; summary: string }[];
  medicineList?: { medicine: string; dosage: string; date: string; doctor: string; source: string }[];
  showQuickActions?: boolean;
}

interface AssistantTabProps {
  persona: PatientPersona;
  onOpenEmergencyCard: () => void;
}

// ─── Intent Detection ──────────────────────────────────────
type Intent = 'history' | 'medicines' | 'compare' | 'share' | 'verify' | 'access' | 'symptom' | 'unknown';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (q.includes('summarize') || q.includes('history') || q.includes('timeline') || q.includes('medical history'))
    return 'history';
  if (q.includes('medicine') || q.includes('prescription') || q.includes('drug') || q.includes('medication') || q.includes('prescribed'))
    return 'medicines';
  if (q.includes('compare') || q.includes('comparison') || q.includes('january') || q.includes('blood report'))
    return 'compare';
  if (q.includes('share') || q.includes('send') || q.includes('grant access'))
    return 'share';
  if (q.includes('verify') || q.includes('verification') || q.includes('authentic') || q.includes('hash') || q.includes('document check'))
    return 'verify';
  if (q.includes('access') || q.includes('who can') || q.includes('permission') || q.includes('consent') || q.includes('check my access'))
    return 'access';
  if (q.includes('headache') || q.includes('fever') || q.includes('pain') || q.includes('symptom') || q.includes('cough') ||
      q.includes('nausea') || q.includes('dizzy') || q.includes('fatigue') || q.includes('numbness') || q.includes('relevant'))
    return 'symptom';
  return 'unknown';
}

// ─── Response Builders ─────────────────────────────────────
function buildHistoryResponse(): Partial<Message> {
  const records = getRecordsSortedByDate();
  return {
    text: `Here is your medical history timeline, Rajesh. You have ${records.length} records on file spanning from ${records[records.length - 1].date} to ${records[0].date}.`,
    timelineEntries: records.map(r => ({
      date: r.date,
      title: r.title,
      doctor: r.doctor,
      summary: r.summary,
    })),
    sources: records.map(r => ({ recordId: r.id, title: r.title, date: r.date })),
    verification: { doctorVerified: true, documentHashVerified: true },
  };
}

function buildMedicineResponse(): Partial<Message> {
  const meds = getMedicinesFromRecords();
  return {
    text: 'Here are all medicines found in your prescription records:',
    medicineList: meds.map(m => ({
      medicine: m.medicine,
      dosage: m.dosage,
      date: m.date,
      doctor: m.doctor,
      source: m.recordTitle,
    })),
    sources: [...new Map(meds.map(m => [m.recordId, { recordId: m.recordId, title: m.recordTitle, date: m.date }])).values()],
    verification: { doctorVerified: true, documentHashVerified: true },
  };
}

function buildCompareResponse(): Partial<Message> {
  const jan = DEMO_RECORDS.find(r => r.id === 'mpr-001')!;
  const sep = DEMO_RECORDS.find(r => r.id === 'mpr-002')!;

  const tests = ['Hemoglobin', 'WBC Count', 'Fasting Blood Sugar', 'HbA1c', 'Total Cholesterol', 'Triglycerides', 'Creatinine'];
  const table: ComparisonRow[] = tests.map(test => {
    const janVal = jan.details[test] || '—';
    const sepVal = sep.details[test] || '—';
    const janNum = parseFloat(janVal.replace(/[^0-9.]/g, ''));
    const sepNum = parseFloat(sepVal.replace(/[^0-9.]/g, ''));
    let change = '—';
    if (!isNaN(janNum) && !isNaN(sepNum)) {
      const diff = sepNum - janNum;
      change = diff > 0 ? `↑ +${diff.toFixed(1)}` : diff < 0 ? `↓ ${diff.toFixed(1)}` : 'No change';
    }
    return { test, january: janVal, september: sepVal, change };
  });

  return {
    text: 'Here is a side-by-side comparison of your January 2026 and September 2026 blood reports. Changes are shown in the last column.',
    comparisonTable: table,
    sources: [
      { recordId: jan.id, title: jan.title, date: jan.date },
      { recordId: sep.id, title: sep.title, date: sep.date },
    ],
    verification: { doctorVerified: true, documentHashVerified: true },
  };
}

function buildShareResponse(query: string): Partial<Message> {
  // Parse doctor name and record from query
  let doctorName = 'Dr. Sharma';
  let recordTitle = 'September Blood Report';
  let duration = '24 hours';

  if (query.toLowerCase().includes('patel')) doctorName = 'Dr. Patel';
  if (query.toLowerCase().includes('january')) recordTitle = 'January Blood Report';
  if (query.toLowerCase().includes('prescription')) recordTitle = 'Prescription - August 2026';
  if (query.toLowerCase().includes('48')) duration = '48 hours';

  const doctor = getDoctorByName(doctorName);

  return {
    text: `I've prepared a sharing request for your record. Please review and confirm:`,
    shareCard: {
      document: recordTitle,
      recipient: doctorName,
      recipientVerified: doctor?.verified ?? false,
      duration,
    },
    sources: [{ recordId: 'mpr-002', title: recordTitle, date: '2026-09-10' }],
  };
}

function buildVerifyResponse(query: string): Partial<Message> {
  let doctorName = 'Dr. Sharma';
  if (query.toLowerCase().includes('patel')) doctorName = 'Dr. Patel';
  const doctor = getDoctorByName(doctorName);

  return {
    text: `Verification results for ${doctorName} and associated document:`,
    verification: {
      doctorVerified: doctor?.verified ?? false,
      documentHashVerified: true,
      timestampVerified: true,
      documentUnmodified: true,
    },
    sources: doctor
      ? [{ recordId: 'doc-verify', title: `${doctorName} — ${doctor.specialty} (${doctor.registrationNumber})`, date: 'Verified' }]
      : [],
  };
}

function buildAccessResponse(query: string): Partial<Message> {
  let doctorName = 'Dr. Sharma';
  if (query.toLowerCase().includes('patel')) doctorName = 'Dr. Patel';
  const doctor = getDoctorByName(doctorName);

  if (!doctor) {
    return { text: `Doctor "${doctorName}" was not found in the system.` };
  }

  const consents = getActiveConsentsForDoctor(doctor.id);
  if (consents.length === 0) {
    return {
      text: `${doctorName} currently has no active access to any of your records. All previous access grants have expired or been revoked.`,
      sources: [],
    };
  }

  const accessEntries: AccessEntry[] = consents.map(c => {
    const record = DEMO_RECORDS.find(r => r.id === c.recordId);
    return {
      recordTitle: record?.title || c.recordId,
      status: c.status,
      expiresAt: new Date(c.expiresAt).toLocaleString(),
    };
  });

  return {
    text: `${doctorName} currently has access to the following records:`,
    accessList: accessEntries,
    sources: consents.map(c => {
      const record = DEMO_RECORDS.find(r => r.id === c.recordId);
      return { recordId: c.recordId, title: record?.title || c.recordId, date: record?.date || '' };
    }),
  };
}

function buildSymptomResponse(query: string): Partial<Message> {
  const relevant = searchRecords(query);
  const hasEmergencyKeywords = /chest pain|breathless|unconscious|severe bleeding|heart attack/i.test(query);

  if (hasEmergencyKeywords) {
    return {
      text: '⚠️ You\'ve mentioned symptoms that could indicate a medical emergency. Please contact emergency services (112) or visit the nearest emergency department immediately.\n\nI found the following relevant records in your history:',
      sources: relevant.slice(0, 3).map(r => ({ recordId: r.id, title: r.title, date: r.date })),
    };
  }

  let text = '';
  if (relevant.length > 0) {
    text = `I searched your medical records for information relevant to your symptoms. Here's what I found:\n\n`;
    relevant.slice(0, 3).forEach(r => {
      text += `• **${r.title}** (${r.date}) — ${r.summary}\n`;
    });
    text += `\n⚕️ **Important**: I cannot diagnose or prescribe treatment. This is a summary of your existing records only. Please discuss your symptoms with a qualified clinician for proper medical advice.`;
  } else {
    text = `I did not find any records in your medical history directly related to your described symptoms.\n\n⚕️ **Important**: I cannot diagnose or prescribe treatment. Please consult a qualified clinician to discuss your symptoms.`;
  }

  return {
    text,
    sources: relevant.slice(0, 3).map(r => ({ recordId: r.id, title: r.title, date: r.date })),
  };
}

// ─── Component ─────────────────────────────────────────────
export const AssistantTab: React.FC<AssistantTabProps> = ({ persona, onOpenEmergencyCard }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `Hi Rajesh 👋 I'm your MedProof AI Assistant.\n\nI can help you understand your existing medical records, find medicines mentioned in them, compare reports, verify documents and doctors, and manage record-sharing permissions.\n\nYour records remain patient-controlled.`,
      timestamp: 'Just now',
      showQuickActions: true,
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickActions = [
    { label: 'Summarize My History', query: 'Summarize my medical history' },
    { label: 'Find My Medicines', query: 'What medicines were prescribed recently?' },
    { label: 'Compare My Reports', query: 'Compare my January and September blood reports' },
    { label: 'Share a Record', query: 'Share my September blood report with Dr. Sharma for 24 hours' },
    { label: 'Verify a Document', query: 'Verify Dr. Sharma and document authenticity' },
    { label: 'Check My Access', query: 'What records can Dr. Sharma access?' },
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const intent = detectIntent(query);
      let response: Partial<Message> = {};

      switch (intent) {
        case 'history':
          response = buildHistoryResponse();
          break;
        case 'medicines':
          response = buildMedicineResponse();
          break;
        case 'compare':
          response = buildCompareResponse();
          break;
        case 'share':
          response = buildShareResponse(query);
          break;
        case 'verify':
          response = buildVerifyResponse(query);
          break;
        case 'access':
          response = buildAccessResponse(query);
          break;
        case 'symptom':
          response = buildSymptomResponse(query);
          break;
        default:
          response = {
            text: `I can help you with:\n• Summarizing your medical history\n• Finding prescribed medicines\n• Comparing reports\n• Sharing records with doctors\n• Verifying documents and doctors\n• Checking who has access to your records\n\nTry one of the quick actions below, or ask about any of these topics.`,
            showQuickActions: true,
          };
      }

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text || '',
        ...response,
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleConfirmShare = (shareCard: ShareCard) => {
    setShareConfirmed(shareCard.document);
    const confirmMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: `✅ **Record shared successfully!**\n\n"${shareCard.document}" has been shared with ${shareCard.recipient} for ${shareCard.duration}.\n\nTransaction logged. The recipient will be notified. You can revoke access at any time from the Consent & Sharing tab.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verification: { documentHashVerified: true, timestampVerified: true },
      sources: [{ recordId: 'share-tx', title: `Share Transaction — ${shareCard.document}`, date: new Date().toISOString().split('T')[0] }],
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-10rem)]">
      {/* Disclaimer Bar */}
      <div className="w-full p-2.5 bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-2 text-center rounded-xl">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Medical-record assistant only. Not a diagnosis or treatment service.</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-teal-600" />
            <span>MedProof AI Assistant</span>
          </h1>
          <p className="text-xs text-slate-500">
            Ask about your records, compare reports, verify documents, or control who can access them.
          </p>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-inner">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>{msg.sender === 'user' ? persona.name : 'MedProof AI'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div className={`p-4 rounded-2xl max-w-2xl text-xs space-y-3 ${
              msg.sender === 'user'
                ? 'bg-teal-700 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-card'
            }`}>
              {/* Main text */}
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Timeline entries for history summary */}
              {msg.timelineEntries && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-teal-800 dark:text-teal-300 text-[11px] block">📋 Medical Timeline</span>
                  {msg.timelineEntries.map((entry, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-bold">{entry.date}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">{entry.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{entry.doctor} — {entry.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Medicine list */}
              {msg.medicineList && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-indigo-800 dark:text-indigo-300 text-[11px] block">💊 Prescribed Medicines</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Medicine</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Dosage</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Date</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Doctor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.medicineList.map((med, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-white">{med.medicine}</td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{med.dosage}</td>
                            <td className="py-1.5 px-2 text-slate-500">{med.date}</td>
                            <td className="py-1.5 px-2 text-slate-500">{med.doctor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comparison table */}
              {msg.comparisonTable && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-indigo-800 dark:text-indigo-300 text-[11px] block">📊 Report Comparison</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Test</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">January</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">September</th>
                          <th className="text-left py-1.5 px-2 font-bold text-slate-700 dark:text-slate-300">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {msg.comparisonTable.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-white">{row.test}</td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{row.january}</td>
                            <td className="py-1.5 px-2 text-slate-600 dark:text-slate-400">{row.september}</td>
                            <td className={`py-1.5 px-2 font-bold ${
                              row.change.includes('↓') ? 'text-emerald-600' : row.change.includes('↑') ? 'text-amber-600' : 'text-slate-400'
                            }`}>{row.change}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Share card */}
              {msg.shareCard && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-2">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 text-[11px] block">📤 Share Record Confirmation</span>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Document:</span><span className="font-semibold text-slate-900 dark:text-white">{msg.shareCard.document}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Recipient:</span><span className="font-semibold text-slate-900 dark:text-white">{msg.shareCard.recipient} {msg.shareCard.recipientVerified && <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-500" />} Verified</span></div>
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Duration:</span><span className="font-semibold text-slate-900 dark:text-white">{msg.shareCard.duration}</span></div>
                    </div>
                    {shareConfirmed !== msg.shareCard.document ? (
                      <button
                        onClick={() => handleConfirmShare(msg.shareCard!)}
                        className="w-full mt-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition-all"
                      >
                        Confirm Share
                      </button>
                    ) : (
                      <div className="mt-2 px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center">
                        ✅ Shared Successfully
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Access list */}
              {msg.accessList && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-teal-800 dark:text-teal-300 text-[11px] block">🔐 Active Access Permissions</span>
                  {msg.accessList.map((entry, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{entry.recordTitle}</span>
                        <span className="text-slate-500">Expires: {entry.expiresAt}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>{entry.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sources section */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> SOURCES
                  </span>
                  {msg.sources.map((src, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-teal-700 dark:text-teal-400">
                      <span>📄 {src.title}</span>
                      {src.date && src.date !== 'Verified' && <span className="text-slate-400">({src.date})</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Verification section */}
              {msg.verification && (
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> VERIFICATION
                  </span>
                  <div className="space-y-0.5 text-[11px]">
                    {msg.verification.doctorVerified !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${msg.verification.doctorVerified ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <span>{msg.verification.doctorVerified ? '✓ Doctor verified' : '✗ Doctor not verified'}</span>
                      </div>
                    )}
                    {msg.verification.documentHashVerified !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${msg.verification.documentHashVerified ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <span>{msg.verification.documentHashVerified ? '✓ Document hash verified' : '✗ Document hash mismatch'}</span>
                      </div>
                    )}
                    {msg.verification.timestampVerified !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>✓ Timestamp verified</span>
                      </div>
                    )}
                    {msg.verification.documentUnmodified !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>✓ Document unmodified</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick actions after bot messages */}
              {msg.showQuickActions && msg.sender === 'assistant' && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(action.query)}
                        className="px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 text-[11px] font-semibold border border-teal-200 dark:border-teal-900 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors text-center"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400 w-56">
            <Sparkles className="w-4 h-4 animate-spin text-teal-600" />
            <span>Searching your records...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Quick Actions:
        </span>
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(action.query)}
            className="px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 text-[11px] font-semibold whitespace-nowrap hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-900 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about your records, medicines, reports, sharing, or verification..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm"
          />
          <button
            onClick={() => handleSendMessage()}
            className="p-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 font-mono">
          <span>Medical-record assistant only • Not a diagnosis service</span>
          <span className="text-teal-600 font-semibold">Patient-controlled records</span>
        </div>
      </div>
    </div>
  );
};
