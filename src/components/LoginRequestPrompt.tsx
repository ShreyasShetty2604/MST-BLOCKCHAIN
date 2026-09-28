import React, { useEffect, useState } from 'react';
import { Smartphone, Check, X, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { mockApi, LOGIN_REQUESTS_STORAGE_KEY } from '../mock/api';
import { LoginRequest } from '../mock/types';
import { scanDeviceBiometric } from '../lib/biometrics';

interface LoginRequestPromptProps {
  onShowToast: (msg: string) => void;
}

// Shown on a signed-in device when someone requests access to this vault via MediID.
export const LoginRequestPrompt: React.FC<LoginRequestPromptProps> = ({ onShowToast }) => {
  const [request, setRequest] = useState<LoginRequest | null>(null);
  const [isVerifyingPasskey, setIsVerifyingPasskey] = useState(false);
  const [passkeyVerified, setPasskeyVerified] = useState(false);

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

  const handleApproveWithPasskey = async () => {
    setIsVerifyingPasskey(true);
    setPasskeyVerified(false);

    try {
      // Execute WebAuthn hardware biometric scan or enclave simulation
      const result = await scanDeviceBiometric();

      if (result.success) {
        setPasskeyVerified(true);
        setTimeout(async () => {
          await mockApi.respondToLoginRequest(request.id, true);
          // Also grant consent to hospital/device for 2 hours
          try {
            await mockApi.grantConsent({
              hospitalId: 'hosp-01',
              hospitalName: request.deviceLabel.includes('Hospital') ? request.deviceLabel : 'Hospital Clinical Terminal',
              tier: 'Tier 2',
              durationHours: 2,
              reason: 'Remote MediID Passkey Access Approval'
            });
          } catch {}

          setIsVerifyingPasskey(false);
          setRequest(null);
          onShowToast(`✓ WebAuthn Passkey Verified! Access approved for ${request.deviceLabel}`);
        }, 800);
      } else {
        setIsVerifyingPasskey(false);
        onShowToast(result.error || 'Passkey verification failed');
      }
    } catch (err: any) {
      setIsVerifyingPasskey(false);
      onShowToast(`Biometric error: ${err?.message || 'Verification failed'}`);
    }
  };

  const handleDeny = async () => {
    await mockApi.respondToLoginRequest(request.id, false);
    setRequest(null);
    onShowToast('Access request denied & logged on-chain.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto shadow-inner">
          <Smartphone className="w-7 h-7" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900 mb-1">
            Incoming MediID Access Request
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Verify Patient Passkey</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Requesting access to vault <strong>{request.mediId}</strong> from <strong>{request.deviceLabel}</strong>.
          </p>
        </div>

        <div className="inline-flex flex-col items-center px-6 py-3 rounded-2xl bg-slate-900 text-white shadow-md">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Matching Session Code</span>
          <span className="text-3xl font-black font-mono tracking-widest text-teal-400">{request.code}</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-300 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>WebAuthn Biometric Guard</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Approving requires Touch ID / Face ID passkey verification on your device.
          </p>
        </div>

        {isVerifyingPasskey ? (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 space-y-2 text-center">
            {passkeyVerified ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <Check className="w-5 h-5" />
                <span>Passkey Signature Verified! Granting Consent...</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Fingerprint className="w-10 h-10 text-teal-600 dark:text-teal-400 animate-pulse mx-auto" />
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-900 dark:text-teal-200">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Scanning Hardware Biometric Passkey...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDeny}
              className="px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <X className="w-4 h-4" />
              <span>Deny Request</span>
            </button>

            <button
              onClick={handleApproveWithPasskey}
              className="px-4 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Fingerprint className="w-4 h-4" />
              <span>Approve with Passkey</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
