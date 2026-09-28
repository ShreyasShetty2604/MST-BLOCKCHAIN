import React, { useState } from 'react';
import {
  Send, Bot, Sparkles, User, ShieldAlert, CheckCircle2, AlertCircle, HelpCircle
} from 'lucide-react';
import { PatientPersona } from '../../mock/types';
import { DisclaimerBar, RedFlagBanner, DataTransparencyPopover } from '../../components/AiAssistantComponents';
import { ChainBadge } from '../../components/ChainBadge';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  hasRedFlag?: boolean;
  structuredReply?: {
    pointTo: string[];
    whatToDo: string[];
    whenDoctor: string[];
  };
  timestamp: string;
}

interface AssistantTabProps {
  persona: PatientPersona;
  onOpenEmergencyCard: () => void;
}

export const AssistantTab: React.FC<AssistantTabProps> = ({ persona, onOpenEmergencyCard }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: `Hello ${persona.name.split(' ')[0]}! I am your MediVault AI Clinical Guidance Assistant. I have read your vault profile once (age, active conditions: ${persona.emergencyInfo.conditions.join(', ')}). How can I assist you today?`,
      structuredReply: {
        pointTo: ['General health inquiry & symptom triage', 'Medication schedule guidance'],
        whatToDo: ['Ask about your symptoms or current medications', 'Use suggested quick symptom chips below'],
        whenDoctor: ['If experiencing severe acute symptoms like chest pain or breathlessness']
      },
      timestamp: 'Just now'
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Data transparency toggle states
  const [sharedFields, setSharedFields] = useState({
    age: true,
    conditions: true,
    allergies: true,
    medications: true
  });

  const suggestedSymptoms = [
    'Fasting blood sugar 145 mg/dL',
    'Mild headache after Metformin',
    'Chest pain and breathlessness',
    'Foot numbness & tingling'
  ];

  const handleToggleField = (field: 'age' | 'conditions' | 'allergies' | 'medications') => {
    setSharedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    const lower = query.toLowerCase();
    const isRedFlag =
      lower.includes('chest pain') ||
      lower.includes('breathless') ||
      lower.includes('unconscious') ||
      lower.includes('severe bleeding') ||
      lower.includes('heart attack');

    setTimeout(() => {
      let structured = {
        pointTo: [
          'Mild blood sugar fluctuation or transient medication adjustment response',
          'Potential hydration or dietary timing influence'
        ],
        whatToDo: [
          'Log your current reading in your self-declared vault history',
          'Maintain regular hydration and follow prescribed Metformin timing after meals',
          'Re-check blood glucose in 2 hours'
        ],
        whenDoctor: [
          'If blood sugar remains consistently > 200 mg/dL over 2 consecutive days',
          'If accompanied by persistent nausea, dizziness, or confusion'
        ]
      };

      if (lower.includes('headache')) {
        structured = {
          pointTo: ['Common mild initiation symptom of oral hypoglycemics', 'Dehydration or blood pressure fluctuation'],
          whatToDo: ['Drink 500ml water and rest in a cool room', 'Check blood pressure if monitor available'],
          whenDoctor: ['If headache is sudden, explosive, or accompanied by blurred vision']
        };
      } else if (lower.includes('numbness')) {
        structured = {
          pointTo: ['Diabetic peripheral neuropathy evaluation recommended', 'Vitamin B12 level assessment'],
          whatToDo: ['Inspect feet daily for cuts or pressure sores', 'Avoid walking barefoot'],
          whenDoctor: ['Schedule routine monofilament foot check with Dr. A. R. Mehta']
        };
      }

      const aiMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: isRedFlag
          ? 'Emergency symptom indicators detected. Prioritize immediate emergency care over AI guidance.'
          : 'Based on your age and diabetic profile, here is structured clinical guidance:',
        hasRedFlag: isRedFlag,
        structuredReply: structured,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-10rem)]">
      {/* Disclaimer Bar */}
      <DisclaimerBar />

      {/* Top Header & Data Transparency Control */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-teal-600" />
            <span>AI Clinical Assistant</span>
          </h1>
          <p className="text-xs text-slate-500">
            Sovereign query engine. Prompts are zero-knowledge and audit-logged.
          </p>
        </div>

        <DataTransparencyPopover
          persona={persona}
          sharedFields={sharedFields}
          onToggleField={handleToggleField}
        />
      </div>

      {/* Chat History Box */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-2 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span>{msg.sender === 'user' ? persona.name : 'MediVault AI'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* If Red Flag, render RedFlagBanner first */}
            {msg.hasRedFlag && (
              <div className="w-full max-w-xl">
                <RedFlagBanner onOpenEmergencyCard={onOpenEmergencyCard} />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`p-4 rounded-2xl max-w-xl text-xs space-y-3 ${
                msg.sender === 'user'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-card'
              }`}
            >
              <p>{msg.text}</p>

              {/* Structured Response Cards */}
              {msg.structuredReply && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-900 space-y-1">
                    <span className="font-bold text-teal-900 dark:text-teal-200 block text-[11px]">
                      1. What this could point to (general):
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      {msg.structuredReply.pointTo.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-[11px]">
                      2. What you can do now:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      {msg.structuredReply.whatToDo.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-900 space-y-1">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
                      3. When to see a doctor:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                      {msg.structuredReply.whenDoctor.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400 w-48">
            <Sparkles className="w-4 h-4 animate-spin text-teal-600" />
            <span>Consulting clinical rules...</span>
          </div>
        )}
      </div>

      {/* Suggested Symptom Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          Suggested:
        </span>
        {suggestedSymptoms.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap hover:bg-teal-100 dark:hover:bg-teal-950 hover:text-teal-800 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Box & On-Chain Audit Receipt Footer */}
      <div className="space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type your symptoms (e.g. Fasting glucose high, headache)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
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
          <span>This chat read your profile once; logged on-chain</span>
          <ChainBadge txHash="0xc3d4e5f6a1b27890123456789abcdef012345680" label="AI Audit Receipt" />
        </div>
      </div>
    </div>
  );
};
