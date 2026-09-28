import React, { useEffect, useState } from 'react';
import { Smartphone, Check, X } from 'lucide-react';
import { mockApi, LOGIN_REQUESTS_STORAGE_KEY } from '../mock/api';
import { LoginRequest } from '../mock/types';

interface LoginRequestPromptProps {
  onShowToast: (msg: string) => void;
}

// Shown on a signed-in device when someone requests login to this vault via its MediID.
export const LoginRequestPrompt: React.FC<LoginRequestPromptProps> = ({ onShowToast }) => {
  const [request, setRequest] = useState<LoginRequest | null>(null);

  useEffect(() => {
    const check = () => setRequest(mockApi.getPendingLoginRequests()[0] ?? null);
    check();
    const timer = setInterval(check, 2000);
    const onStorage = (e: StorageEvent) => e.key === LOGIN_REQUESTS_STORAGE_KEY && check();
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  if (!request) return null;

  const respond = async (approve: boolean) => {
    await mockApi.respondToLoginRequest(request.id, approve);
    setRequest(null);
    onShowToast(approve ? `Login approved for ${request.deviceLabel}` : 'Login request denied');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Login request</h3>
          <p className="text-xs text-slate-500 mt-1">
            Someone is trying to sign in to your vault ({request.mediId}) from <strong>{request.deviceLabel}</strong>.
          </p>
        </div>
        <div className="inline-flex flex-col items-center px-6 py-3 rounded-2xl bg-slate-900 text-white">
          <span className="text-[10px] font-mono text-slate-400">CODE ON THAT DEVICE</span>
          <span className="text-3xl font-black font-mono tracking-widest">{request.code}</span>
        </div>
        <p className="text-[11px] text-slate-500">Only approve if this was you and the codes match.</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => respond(false)}
            className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Deny</span>
          </button>
          <button
            onClick={() => respond(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>Approve</span>
          </button>
        </div>
      </div>
    </div>
  );
};
