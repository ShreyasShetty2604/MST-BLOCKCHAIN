import React, { useState, useEffect } from 'react';
import {
  Fingerprint, Send, ShieldCheck, KeyRound, ArrowRight, RefreshCw, CheckCircle2, UserPlus, Lock, Database, AlertCircle
} from 'lucide-react';
import { PatientPersona } from '../../mock/types';
import { mockApi } from '../../mock/api';
import { formatMediId } from '../../lib/formatters';
import { scanDeviceBiometric, registerDeviceBiometric } from '../../lib/biometrics';

interface LoginPageProps {
  onLoginSuccess: (persona: PatientPersona) => void;
  onGoToOnboarding: () => void;
  onShowToast: (msg: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onGoToOnboarding,
  onShowToast
}) => {
  const [loginMethod, setLoginMethod] = useState<'biometric' | 'id-request'>('biometric');
  const [isScanning, setIsScanning] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // MediID request login states
  const [inputMediId, setInputMediId] = useState('91-2345-6789-0123');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Prompt for new fingerprint vs existing
  const [showNewFingerprintPrompt, setShowNewFingerprintPrompt] = useState(false);

  useEffect(() => {
    // Check if test data exists in local storage
    mockApi.getPersonas().then((personas) => {
      if (personas && personas.length > 0) {
        setDataLoaded(true);
      }
    });
  }, []);

  const handleLoadTestData = async () => {
    setIsSeedingData(true);
    try {
      await mockApi.resetDemoData();
      const defaultPatient = await mockApi.getCurrentPatient();
      setDataLoaded(true);
      onShowToast(`Loaded active demo data for ${defaultPatient.name}! Unlocking dashboard...`);
      // Immediately open patient dashboard with demo data!
      onLoginSuccess(defaultPatient);
    } finally {
      setIsSeedingData(false);
    }
  };

  const handleBiometricScan = async (forceNew: boolean = false) => {
    setIsScanning(true);
    setShowNewFingerprintPrompt(false);

    try {
      if (forceNew) {
        setShowNewFingerprintPrompt(true);
        return;
      }

      onShowToast('Please touch your device fingerprint sensor (Touch ID / Windows Hello)...');
      const res = await scanDeviceBiometric();

      if (res.success) {
        const currentPatient = await mockApi.getCurrentPatient();
        if (currentPatient) {
          onShowToast(`✓ Touch ID Biometric authentication verified for ${currentPatient.name}!`);
          onLoginSuccess(currentPatient);
        } else {
          setShowNewFingerprintPrompt(true);
        }
      } else if (res.cancelled) {
        onShowToast('Biometric scan prompt was cancelled.');
      } else {
        onShowToast(res.error || 'Biometric verification could not complete.');
      }
    } catch (err: any) {
      onShowToast('Biometric sensor error: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendIdRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMediId) return;

    setIsSendingRequest(true);
    setTimeout(async () => {
      const patient = await mockApi.getPatientById(inputMediId);
      setIsSendingRequest(false);

      if (patient) {
        setRequestSent(true);
        onShowToast(`Login access request approved for ${patient.name}!`);
        setTimeout(() => {
          onLoginSuccess(patient);
        }, 1000);
      } else {
        onShowToast('MediID not found. Please verify 14-digit MediID.');
      }
    }, 1200);
  };

  return (
    <div className="max-w-xl mx-auto w-full py-10 px-4 space-y-6 animate-fade-in">
      {/* Initial Top Banner: Load Test Data Action */}
      <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-900 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/60 rounded-xl text-teal-700 dark:text-teal-300 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-xs">
              Initial Demo Environment Setup
            </h3>
            <p className="text-[11px] text-slate-500">
              Click below to load test data and directly open the active patient dashboard.
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadTestData}
          disabled={isSeedingData}
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md shrink-0 disabled:opacity-50 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
        >
          {isSeedingData ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Loading Demo Data...</span>
            </>
          ) : (
            <>
              <Database className="w-3.5 h-3.5" />
              <span>Load Test Data & Launch Dashboard</span>
            </>
          )}
        </button>
      </div>

      {/* Main Lock Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 text-center">
        {/* Lock Icon Header */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-teal-700 text-white flex items-center justify-center mx-auto shadow-glow-teal">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Unlock Sovereign MediVault
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your patient records, consents, and AI assistant are locked behind biometric passkey encryption.
          </p>
        </div>

        {/* Login Method Tab Switcher */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <button
            onClick={() => setLoginMethod('biometric')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              loginMethod === 'biometric'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            <span>Biometric Passkey</span>
          </button>

          <button
            onClick={() => setLoginMethod('id-request')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
              loginMethod === 'id-request'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Request ID Access</span>
          </button>
        </div>

        {/* METHOD 1: BIOMETRIC LOGIN */}
        {loginMethod === 'biometric' && (
          <div className="space-y-6 pt-2 animate-fade-in">
            <div className="relative w-36 h-36 mx-auto rounded-3xl bg-slate-900 border-2 border-teal-500 flex items-center justify-center overflow-hidden shadow-2xl group">
              {isScanning && (
                <div className="absolute inset-x-0 h-1 bg-teal-400 shadow-glow-teal animate-scan-line z-20" />
              )}
              <Fingerprint
                className={`w-20 h-20 transition-all duration-300 ${
                  isScanning ? 'text-teal-400 animate-pulse' : 'text-slate-500 group-hover:text-teal-400'
                }`}
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleBiometricScan(false)}
                disabled={isScanning}
                className="w-full py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-95"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Hardware Passkey...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Scan Fingerprint to Unlock Vault</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleBiometricScan(true)}
                className="text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 underline block mx-auto"
              >
                Test with Unrecognized Fingerprint (Triggers New User Prompt)
              </button>
            </div>
          </div>
        )}

        {/* METHOD 2: REQUEST ACCESS VIA MEDIID */}
        {loginMethod === 'id-request' && (
          <form onSubmit={handleSendIdRequest} className="space-y-4 pt-2 text-left text-xs animate-fade-in">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Enter 14-Digit MediID or Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 91-2345-6789-0123"
                value={inputMediId}
                onChange={(e) => setInputMediId(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                A login access grant notification will be dispatched to your registered device.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSendingRequest || requestSent}
              className="w-full py-3.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSendingRequest ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Login Request...</span>
                </>
              ) : requestSent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Access Approved! Unlocking...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Login Access Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* NEW FINGERPRINT MODAL PROMPT */}
      {showNewFingerprintPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                New Fingerprint Detected!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This biometric passkey is not linked to any existing vault. Would you like to create a new user profile?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={onGoToOnboarding}
                className="w-full py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create New User & Vault</span>
              </button>

              <button
                onClick={() => setShowNewFingerprintPrompt(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Cancel / Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
