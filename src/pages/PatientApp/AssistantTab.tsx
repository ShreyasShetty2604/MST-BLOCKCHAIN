import React, { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, FileText, HeartPulse, Loader2, MessageCircleHeart, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Consent, MedicalRecord, PatientPersona } from '../../mock/types';
import { mockApi } from '../../mock/api';
import { AssistantResponse, buildAssistantResponse, validateRecordGrounding } from '../../features/assistant/medicalAssistant';

type Message = { id: string; sender: 'user' | 'assistant'; text: string; timestamp: string; sources?: MedicalRecord[]; timeline?: MedicalRecord[]; record?: MedicalRecord; medicines?: NonNullable<AssistantResponse['medicineList']>; comparison?: NonNullable<AssistantResponse['comparisonTable']>; verification?: MedicalRecord; share?: NonNullable<AssistantResponse['shareRequest']>; grounded?: boolean; };
interface AssistantTabProps { persona: PatientPersona; onOpenEmergencyCard: () => void; }
const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

export const AssistantTab: React.FC<AssistantTabProps> = ({ persona }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]); const [consents, setConsents] = useState<Consent[]>([]); const [loadingRecords, setLoadingRecords] = useState(true);
  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', sender: 'assistant', timestamp: 'Just now', text: `Hi ${persona.name.split(' ')[0]} 👋 I’m your MediVault AI Assistant. I can only use records belonging to this vault.` }]);
  const [input, setInput] = useState(''); const [typing, setTyping] = useState(false); const endRef = useRef<HTMLDivElement>(null);
  const actions = [['Summarize My History', 'Summarize my medical history'], ['Find My Medicines', 'What medicines were prescribed recently?'], ['Compare My Reports', 'Compare my reports'], ['Share a Record', 'Share my latest blood report with Dr. Sharma for 24 hours'], ['Verify a Document', 'Verify my latest blood report'], ['Check My Access', 'What records can Dr. Sharma access?']];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);
  useEffect(() => {
    let cancelled = false; setLoadingRecords(true); setRecords([]); setConsents([]); setMessages([{ id: `welcome-${persona.id}`, sender: 'assistant', timestamp: 'Just now', text: `Hi ${persona.name.split(' ')[0]} 👋 I’m your MediVault AI Assistant. I can only use records belonging to this vault.` }]);
    Promise.all([mockApi.getRecords('All', persona.id), mockApi.getConsents()]).then(([patientRecords, patientConsents]) => { if (!cancelled) { setRecords(patientRecords); setConsents(patientConsents); setLoadingRecords(false); } }).catch(() => { if (!cancelled) setLoadingRecords(false); });
    return () => { cancelled = true; };
  }, [persona.id, persona.name]);

  const answer = (query: string): Omit<Message, 'id' | 'sender' | 'timestamp'> => {
    if (!records.length) return { text: `There are no medical records available in ${persona.name}'s vault yet. I cannot show records from another patient.`, sources: [] };
    const asksForDoctorNames = /\b(?:doctor|doctors)\b.*\b(?:name|names|list|who)\b|\b(?:name|names|list|who)\b.*\b(?:doctor|doctors)\b/i.test(query);
    if (asksForDoctorNames) {
      const doctorRecords = records.filter(record => /^Dr\.\s/i.test(record.doctor || ''));
      const doctors = [...new Map(doctorRecords.map(record => [record.doctor, record])).values()];
      return doctors.length ? { text: `The doctors named in ${persona.name}'s records are:\n\n${doctors.map(record => `• ${record.doctor} — ${record.source}`).join('\n')}`, sources: doctorRecords, grounded: true } : { text: `I couldn't find any doctor names in ${persona.name}'s records.`, sources: [] };
    }
    const response = buildAssistantResponse(query, persona, records, consents);
    const sources = response.sources.map(source => records.find(record => record.id === source.recordId)).filter((record): record is MedicalRecord => Boolean(record));
    return { text: response.text, sources, timeline: response.timelineEntries ? sources : undefined, record: response.intent === 'RECORD_LOOKUP' ? sources[0] : undefined, medicines: response.medicineList, comparison: response.comparisonTable, verification: response.verification ? sources[0] : undefined, share: response.shareRequest, grounded: response.sources.length > 0 && validateRecordGrounding(records, response.sources).grounded };
  };
  const send = (value = input) => { if (!value.trim() || loadingRecords) return; setMessages(previous => [...previous, { id: `u-${Date.now()}`, sender: 'user', text: value, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); setInput(''); setTyping(true); window.setTimeout(() => { const next = answer(value); setMessages(previous => [...previous, { ...next, id: `a-${Date.now()}`, sender: 'assistant', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]); setTyping(false); }, 350); };

  return <div className="assistant-shell animate-fade-in flex flex-col h-[calc(100vh-10rem)]">
    <div className="assistant-safety"><ShieldCheck className="w-4 h-4 shrink-0" />Medical-record assistant only. Not a diagnosis or treatment service.</div>
    <header className="assistant-hero"><div className="assistant-showcase-nav"><b>MediVault<span>AI</span></b><div><span>Private Vault</span><span>Record Intelligence</span><span>Secure by design</span></div><i /></div><div className="assistant-hero-copy"><div className="assistant-eyebrow"><Sparkles className="w-3.5 h-3.5" /> Your private health companion</div><h1>Your health records,<br/><em>intelligently</em> in view.</h1><p>Clear answers from {persona.name.split(' ')[0]}’s vault only — thoughtfully organized and always in your control.</p><div className="assistant-status"><span className="assistant-status-dot" />{loadingRecords ? 'Securing vault context…' : `${records.length} record${records.length === 1 ? '' : 's'} in this vault`}</div></div><div className="nurse-scene" aria-label="Animated robotic nurse companion" role="img"><div className="nurse-orbit nurse-orbit-one" /><div className="nurse-orbit nurse-orbit-two" /><div className="nurse-figure"><div className="nurse-antenna" /><div className="nurse-head"><Bot /></div><div className="nurse-body"><HeartPulse /><span>AI</span></div></div><div className="nurse-caption">Here to help</div></div></header>
    <div className="assistant-chat flex-1 overflow-y-auto space-y-4">
      {loadingRecords && <div className="assistant-typing"><Loader2 className="w-4 h-4 animate-spin" />Loading this vault’s records…</div>}
      {messages.map(message => <div key={message.id} className={`flex flex-col gap-2 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}><span className="assistant-message-meta">{message.sender === 'user' ? persona.name : 'MediVault AI'} <span>•</span> {message.timestamp}</span><div className={`assistant-message p-4 max-w-2xl text-xs space-y-3 ${message.sender === 'user' ? 'assistant-message-user' : 'assistant-message-ai'}`}><div className="whitespace-pre-wrap">{message.text}</div>
        {message.record && <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700"><b className="text-teal-700 dark:text-teal-300">Recorded details</b>{Object.entries(message.record.payload.details).map(([label, value]) => <div key={label} className="mt-1 text-slate-600 dark:text-slate-300"><span className="font-semibold">{label}:</span> {value}</div>)}</div>}
        {message.timeline?.map(record => <div key={record.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700"><b className="text-teal-700 dark:text-teal-300">{record.id} · {formatDate(record.date)}</b><div className="font-semibold">{record.title}</div><div className="text-slate-500">{record.doctor || 'Not recorded'} · {record.source}</div></div>)}
        {message.medicines && <table className="w-full text-[11px]"><thead><tr className="text-left border-b"><th>Medicine</th><th>Date</th><th>Doctor</th><th>Record</th></tr></thead><tbody>{message.medicines.map(item => <tr key={`${item.medicine}-${item.date}`} className="border-b border-slate-100 dark:border-slate-800"><td className="py-1">{item.medicine}<br/><span className="text-slate-500">{item.dosage}</span></td><td>{formatDate(item.date)}</td><td>{item.doctor}</td><td>{item.source}</td></tr>)}</tbody></table>}
        {message.comparison && <table className="w-full text-[11px]"><thead><tr className="text-left border-b"><th>Test</th><th>Earlier</th><th>Later</th><th>Change</th></tr></thead><tbody>{message.comparison.map(item => <tr key={item.test} className="border-b border-slate-100 dark:border-slate-800"><td>{item.test}</td><td>{item.earlier}</td><td>{item.later}</td><td>{item.change}</td></tr>)}</tbody></table>}
        {message.share && <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 space-y-1"><b>Share request ready</b><div>Document: {message.share.record.id} · {message.share.record.title}</div><div>Recipient: {message.share.recipient}</div><div>Duration: {message.share.durationHours} hours</div></div>}
        {message.verification && <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-1"><b>Verification</b><div>Document hash: {message.verification.hash}</div><div>Source: {message.verification.source} · block {message.verification.blockNumber}</div></div>}
        {message.sources?.length ? <section className="border-t pt-2"><b className="flex gap-1 items-center"><FileText className="w-3.5 h-3.5" /> SOURCES FROM THIS VAULT</b>{message.sources.map(record => <div key={record.id} className="text-teal-700 dark:text-teal-300 mt-1">{record.id} · {record.title} · {formatDate(record.date)} · {record.doctor || record.source}</div>)}</section> : null}
        {message.grounded && <div className="border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2 text-emerald-800 dark:text-emerald-300 font-semibold"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />GROUNDED IN THIS PATIENT’S RECORDS<br/><span className="font-normal">{message.sources?.length || 0} source record(s) used · {message.sources?.map(record => record.id).join(' · ')}</span></div>}
      </div></div>)}
      {typing && <div className="assistant-typing"><Sparkles className="w-4 h-4 animate-spin" />Checking this vault’s records…</div>}<div ref={endRef} />
    </div>
    <div className="assistant-suggestions"><span><MessageCircleHeart className="w-4 h-4" />Try asking</span><div>{actions.map(([label, query]) => <button key={label} onClick={() => send(query)} disabled={loadingRecords}>{label}</button>)}</div></div>
    <div className="assistant-composer"><input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} disabled={loadingRecords} placeholder={loadingRecords ? 'Loading this vault…' : 'Ask about this patient’s records, medicines, reports, sharing, or verification…'} /><button onClick={() => send()} disabled={loadingRecords} aria-label="Send message"><Send className="w-4 h-4" /></button></div>
  </div>;
};
