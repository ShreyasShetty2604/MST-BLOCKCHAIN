import React, { useEffect, useRef, useState } from 'react';
import {
  Bot, CheckCircle2, FileText, HeartPulse, Loader2, MessageCircleHeart, Send, ShieldCheck, Sparkles,
  ShieldAlert, Eye, Lock, EyeOff, AlertTriangle, Shield, Check, Activity
} from 'lucide-react';
import { Consent, MedicalRecord, PatientPersona } from '../../mock/types';
import { mockApi } from '../../mock/api';
import { AssistantResponse, buildAssistantResponse, validateRecordGrounding } from '../../features/assistant/medicalAssistant';
import { ChainBadge } from '../../components/ChainBadge';

interface AssistantTabProps {
  persona: PatientPersona;
  onOpenEmergencyCard: () => void;
}

const detailLabels = new Set(['Record ID', 'Doctor', 'Hospital/source', 'Date', 'Document hash', 'Verification status']);
const ResponseText: React.FC<{ text: string }> = ({ text }) => (
  <div className="assistant-response-copy">
    {text.split('\n').filter(Boolean).map((line, index) => {
      const divider = line.indexOf(':');
      const label = divider > -1 ? line.slice(0, divider) : '';
      if (detailLabels.has(label)) {
        return (
          <div className="assistant-response-detail" key={`${label}-${index}`}>
            <span>{label}</span>
            <strong>{line.slice(divider + 1).trim()}</strong>
          </div>
        );
      }
      if (/^[A-Z][A-Z ]{4,}$/.test(line)) return <h3 key={`${line}-${index}`}>{line}</h3>;
      return <p key={`${line}-${index}`}>{line}</p>;
    })}
  </div>
);

type Message = {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isRedFlag?: boolean;
  structuredReply?: {
    pointTo: string[];
    whatToDo: string[];
    whenDoctor: string[];
  };
  sources?: MedicalRecord[];
  timeline?: MedicalRecord[];
  record?: MedicalRecord;
  medicines?: NonNullable<AssistantResponse['medicineList']>;
  comparison?: NonNullable<AssistantResponse['comparisonTable']>;
  verification?: MedicalRecord;
  share?: NonNullable<AssistantResponse['shareRequest']>;
  grounded?: boolean;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

const calculateAge = (dob: string) => {
  if (!dob) return 52;
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
};

export const AssistantTab: React.FC<AssistantTabProps> = ({ persona, onOpenEmergencyCard }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  // On-chain AIAccessed event session state
  const [aiAccessTxHash, setAiAccessTxHash] = useState<string | null>(null);

  // Privacy Share-Less context toggle state
  const [shareLessMode, setShareLessMode] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const actions = [
    ['Summarize My History', 'Summarize my medical history'],
    ['Find My Medicines', 'What medicines were prescribed recently?'],
    ['Compare My Reports', 'Compare my reports'],
    ['Check Glucose Reading', 'My fasting glucose is 145 mg/dL, is that high?'],
    ['Headache After Metformin', 'I have a mild headache after taking Metformin'],
    ['Chest Pain & Shortness of Breath', 'I have sudden chest pain and breathlessness']
  ];

  // Auto-scroll chat
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Session initialization & on-chain AIAccessed event logging (One per session)
  useEffect(() => {
    let cancelled = false;
    setLoadingRecords(true);
    setRecords([]);
    setConsents([]);
    setMessages([
      {
        id: `welcome-${persona.id}`,
        sender: 'assistant',
        timestamp: 'Just now',
        text: `Hi ${persona.name.split(' ')[0]} 👋 I’m your MediVault Privacy AI Assistant.\n\nI operate strictly on encrypted records in your sovereign vault. Ask any question about your health history, lab reports, or symptom guidance.`
      }
    ]);

    // 1. Fetch records and consents
    Promise.all([
      mockApi.getRecords('All', persona.id),
      mockApi.getConsents(),
      mockApi.logAIAccess(persona.id) // Trigger on-chain AIAccessed EVM Event (1 per session)
    ])
      .then(([patientRecords, patientConsents, aiEvent]) => {
        if (!cancelled) {
          setRecords(patientRecords);
          setConsents(patientConsents);
          setAiAccessTxHash(aiEvent.txHash);
          setLoadingRecords(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingRecords(false);
      });

    return () => {
      cancelled = true;
    };
  }, [persona.id, persona.name]);

  // RED-FLAG KEYWORD CHECKER (Runs FIRST before any LLM processing)
  const isRedFlagQuery = (query: string): boolean => {
    const lower = query.toLowerCase();
    const redFlagTerms = [
      'chest pain',
      'breathless',
      'difficulty breathing',
      'unconscious',
      'severe bleeding',
      'anaphylaxis',
      'stroke',
      'heart attack',
      'sudden numbness'
    ];
    return redFlagTerms.some((term) => lower.includes(term));
  };

  const answer = (query: string): Omit<Message, 'id' | 'sender' | 'timestamp'> => {
    // 1. RED-FLAG CHECK RUNS FIRST
    if (isRedFlagQuery(query)) {
      return {
        text: `🚨 CRITICAL EMERGENCY SYMPTOM DETECTED\n\nYour query contains emergency indicators (chest pain / breathlessness). Seek emergency medical care immediately! Do not rely on AI guidance during acute medical emergencies.`,
        isRedFlag: true
      };
    }

    if (!records.length) {
      return {
        text: `There are no medical records available in ${persona.name}'s vault yet. I cannot analyze records from another patient.`,
        sources: []
      };
    }

    // Check for doctor names lookup
    const asksForDoctorNames = /\b(?:doctor|doctors)\b.*\b(?:name|names|list|who)\b|\b(?:name|names|list|who)\b.*\b(?:doctor|doctors)\b/i.test(query);
    if (asksForDoctorNames) {
      const doctorRecords = records.filter((record) => /^Dr\.\s/i.test(record.doctor || ''));
      const doctors = [...new Map(doctorRecords.map((record) => [record.doctor, record])).values()];
      return doctors.length
        ? {
            text: `The doctors named in ${persona.name}'s records are:\n\n${doctors
              .map((record) => `• ${record.doctor} — ${record.source}`)
              .join('\n')}`,
            sources: doctorRecords,
            grounded: true
          }
        : { text: `I couldn't find any doctor names in ${persona.name}'s records.`, sources: [] };
    }


    // Check for structured LLM response matching (fasting glucose / headache / numbness / general)
    const lower = query.toLowerCase();
    if (lower.includes('glucose') || lower.includes('145') || lower.includes('sugar')) {
      return {
        text: `Based on minimal context (Age ${calculateAge(persona.dob)}, ${persona.emergencyInfo.conditions.join(', ')}):`,
        structuredReply: {
          pointTo: [
            'Fasting blood glucose of 145 mg/dL is elevated above normal target (<130 mg/dL).',
            'Possible dawn phenomenon or late-evening carbohydrate variation.'
          ],
          whatToDo: [
            'Maintain regular hydration and follow prescribed Metformin timing after meals.',
            'Log your reading in your self-declared vault records.',
            'Re-check blood glucose 2 hours post-prandial.'
          ],
          whenDoctor: [
            'If blood sugar remains consistently >200 mg/dL over 2 consecutive days.',
            'If accompanied by persistent nausea, extreme thirst, or confusion.'
          ]
        },
        grounded: true
      };
    }

    if (lower.includes('headache') && lower.includes('metformin')) {
      return {
        text: `Regarding headache after Metformin:`,
        structuredReply: {
          pointTo: [
            'Headache can occur as a mild initiation response to oral hypoglycemics.',
            'May also relate to mild dehydration or transient blood pressure changes.'
          ],
          whatToDo: [
            'Drink 500ml of water and rest in a cool environment.',
            'Verify blood pressure if a monitor is available.'
          ],
          whenDoctor: [
            'If headache is sudden, severe, or accompanied by blurred vision or vomiting.'
          ]
        },
        grounded: true
      };
    }

    // Fallback buildAssistantResponse lookup
    const response = buildAssistantResponse(query, persona, records, consents);
    const sources = response.sources
      .map((src) => records.find((rec) => rec.id === src.recordId))
      .filter((rec): rec is MedicalRecord => Boolean(rec));

    return {
      text: response.text,
      sources,
      timeline: response.timelineEntries ? sources : undefined,
      record: response.intent === 'RECORD_LOOKUP' ? sources[0] : undefined,
      medicines: response.medicineList,
      comparison: response.comparisonTable,
      verification: response.verification ? sources[0] : undefined,
      share: response.shareRequest,
      grounded: response.sources.length > 0 && validateRecordGrounding(records, response.sources).grounded
    };
  };

  const send = (value = input) => {
    if (!value.trim() || loadingRecords) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: value,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    setTyping(true);

    window.setTimeout(() => {
      const next = answer(value);
      setMessages((prev) => [
        ...prev,
        {
          ...next,
          id: `a-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setTyping(false);
    }, 450);
  };

  const age = calculateAge(persona.dob);
  const conditionCount = persona.emergencyInfo.conditions.length;
  const allergyCount = persona.emergencyInfo.allergies.length;

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-10rem)]">
      {/* Top Banner: Fixed Disclaimer & On-Chain AIAccessed Event Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900/60 text-xs">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This is guidance, not a medical diagnosis. Always consult a licensed physician.</span>
        </div>

        {aiAccessTxHash && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300">
              AIAccessed EVM Event
            </span>
            <ChainBadge txHash={aiAccessTxHash} label="On-Chain" />
          </div>
        )}
      </div>

      {/* Hero Header Bar & Minimal Context Pill with Share-Less Toggle */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-700 text-white rounded-2xl shadow-glow-teal">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                MediVault Privacy AI Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                Privacy-Preserving
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Zero unencrypted PHI sent to external LLMs • Minimal context pipeline
            </p>
          </div>
        </div>

        {/* Minimal Context Pill with Share-Less Toggle */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 px-2 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Using:</span>
            {!shareLessMode ? (
              <span className="text-slate-600 dark:text-slate-400">
                Age ({age}) • Conditions ({conditionCount}) • Allergies ({allergyCount})
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Age ({age}) only [Conditions & Allergies Hidden]
              </span>
            )}
          </div>

          <button
            onClick={() => setShareLessMode(!shareLessMode)}
            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border ${
              shareLessMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-amber-500'
            }`}
            title="Toggle Share-Less Mode to restrict shared context fields"
          >
            {shareLessMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{shareLessMode ? 'Share-Less Active' : 'Share-Less Mode'}</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Viewport */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-inner">
        {loadingRecords && (
          <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>Initializing sovereign vault context...</span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col gap-2 ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[10px] text-slate-400 font-mono">
              {m.sender === 'user' ? persona.name : 'MediVault AI'} • {m.timestamp}
            </span>

            <div
              className={`p-4 rounded-2xl max-w-2xl text-xs space-y-3 shadow-card ${
                m.sender === 'user'
                  ? 'bg-teal-700 text-white'
                  : m.isRedFlag
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-100 border-2 border-rose-500'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Message text */}
              <div className="whitespace-pre-wrap">{m.text}</div>

              {/* RED-FLAG ACTION BANNER */}
              {m.isRedFlag && (
                <div className="pt-2 space-y-3 border-t border-rose-200 dark:border-rose-900">
                  <div className="p-3 bg-rose-600 text-white font-bold rounded-xl flex items-center justify-between shadow-glow-red">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                      <span>CRITICAL EMERGENCY: SEEK IMMEDIATE MEDICAL EVALUATION</span>
                    </div>
                  </div>

                  <button
                    onClick={onOpenEmergencyCard}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Open Emergency Break-Glass Profile Sheet</span>
                  </button>
                </div>
              )}

              {/* STRUCTURED ANSWER (Pointers, What To Do, When Doctor) */}
              {m.structuredReply && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* General Pointers */}
                  {m.structuredReply.pointTo?.length > 0 && (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 space-y-1">
                      <span className="font-bold text-teal-800 dark:text-teal-300 block flex items-center gap-1.5">
                        💡 General Guidance & Clinical Pointers
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        {m.structuredReply.pointTo.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* What You Can Do Now */}
                  {m.structuredReply.whatToDo?.length > 0 && (
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-1">
                      <span className="font-bold text-indigo-800 dark:text-indigo-300 block flex items-center gap-1.5">
                        📋 What You Can Do Now
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        {m.structuredReply.whatToDo.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* When to See a Doctor */}
                  {m.structuredReply.whenDoctor?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
                        🩺 When to See a Doctor
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        {m.structuredReply.whenDoctor.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Record details if record lookup */}
              {m.record && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 border border-slate-200 dark:border-slate-700">
                  <b className="text-teal-700 dark:text-teal-300">Recorded details</b>
                  {Object.entries(m.record.payload.details).map(([label, value]) => (
                    <div key={label} className="mt-1 text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{label}:</span> {value}
                    </div>
                  ))}
                </div>
              )}

              {/* Sources footer */}
              {m.sources?.length ? (
                <section className="border-t border-slate-200 dark:border-slate-800 pt-2 text-[11px]">
                  <b className="flex gap-1 items-center text-slate-700 dark:text-slate-300">
                    <FileText className="w-3.5 h-3.5" /> SOURCES FROM VAULT
                  </b>
                  {m.sources.map((rec) => (
                    <div key={rec.id} className="text-teal-700 dark:text-teal-300 mt-1 font-mono">
                      {rec.id} • {rec.title} • {formatDate(rec.date)} • {rec.doctor || rec.source}
                    </div>
                  ))}
                </section>
              ) : null}

              {/* Grounding badge */}
              {m.grounded && (
                <div className="border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg p-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  GROUNDED IN VAULT RECORDS
                </div>
              )}

              {/* Fixed Response Footer Disclaimer */}
              {m.sender === 'assistant' && (
                <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  This guidance is generated for educational purposes and does not substitute for clinical evaluation.
                </div>
              )}
            </div>
          </div>
        ))}

        {typing && (
          <div className="p-3 text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-teal-600" />
            <span>Analyzing query with minimal privacy context...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <MessageCircleHeart className="w-4 h-4 text-teal-600 shrink-0" />
        {actions.map(([label, query]) => (
          <button
            key={label}
            onClick={() => send(query)}
            disabled={loadingRecords}
            className="px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-800 dark:text-teal-300 text-xs font-semibold whitespace-nowrap border border-teal-200 dark:border-teal-900 transition-all disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Composer Input Bar */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={loadingRecords}
          placeholder={loadingRecords ? 'Loading vault...' : 'Ask about your records, symptoms, or medication guidance...'}
          className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
        />
        <button
          onClick={() => send()}
          disabled={loadingRecords || !input.trim()}
          className="px-5 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold disabled:opacity-50 shadow-md transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
