import React, { useState } from 'react';
import {
  Shield, Key, Lock, ArrowRight, Fingerprint, Dna, CheckCircle2,
  FileCheck, Download, Building2, ShieldCheck, Sparkles, RefreshCw, Camera, ShieldAlert
} from 'lucide-react';
import { HealthIdCard } from '../components/HealthIdCard';
import { PendingChainChip } from '../components/ChainBadge';
import { PatientPersona } from '../mock/types';
import { mockApi } from '../mock/api';
import { registerDeviceBiometric, scanDeviceBiometric } from '../lib/biometrics';

interface LandingOnboardingPageProps {
  onCompleteOnboarding: () => void;
  onGoHospitalLogin: () => void;
  onGoAdminLogin?: () => void;
  onOpenScanner?: () => void;
}

export const LandingOnboardingPage: React.FC<LandingOnboardingPageProps> = ({
  onCompleteOnboarding,
  onGoHospitalLogin,
  onGoAdminLogin,
  onOpenScanner
}) => {
  const [view, setView] = useState<'landing' | 'onboarding'>('landing');
  const [step, setStep] = useState<number>(1);

  // Form states
  const [name, setName] = useState('');
  const [dob, setDob] = useState('1995-06-20');
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [otp, setOtp] = useState(['6', '2', '9', '1', '0', '4']);
  const [isScanningBiometrics, setIsScanningBiometrics] = useState(false);
  const [biometricsDone, setBiometricsDone] = useState(false);
  const [biometricType, setBiometricType] = useState<'platform-hardware' | 'simulated-enclave' | 'custom-passkey' | null>(null);
  const [biometricEnrollMode, setBiometricEnrollMode] = useState<'hardware' | 'virtual'>('virtual');
  const [selectedVirtualFinger, setSelectedVirtualFinger] = useState<string>('unique-fresh');
  const [biometricCredId, setBiometricCredId] = useState<string>('');
  const [biometricStatusMsg, setBiometricStatusMsg] = useState<string>('');
  const [isScanningDeviceBio, setIsScanningDeviceBio] = useState(false);
  const [landingBioToast, setLandingBioToast] = useState<string | null>(null);
  const [dnaSaltedHash, setDnaSaltedHash] = useState('0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8f');
  const [isSubmittingVault, setIsSubmittingVault] = useState(false);
  const [createdTxHash, setCreatedTxHash] = useState('0x3f2a91b84e72c5108d9302194b1a7e4c9c1d84a2');

  const startCreateNewVault = (preset?: 'clean' | 'priya' | 'arjun') => {
    if (preset === 'priya') {
      setName('Priya Sharma');
      setDob('1998-04-12');
      setGender('Female');
      setPhone('+91 98112 34567');
      setBloodGroup('O+');
      setAllergies('Peanuts');
      setEmergencyContactName('Karan Sharma');
      setEmergencyContactPhone('+91 98112 34568');
    } else if (preset === 'arjun') {
      setName('Dr. Arjun Patel');
      setDob('1985-11-28');
      setGender('Male');
      setPhone('+91 97234 56780');
      setBloodGroup('A+');
      setAllergies('None');
      setEmergencyContactName('Anjali Patel');
      setEmergencyContactPhone('+91 97234 56781');
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      setName('');
      setDob('1996-08-15');
      setGender('Other');
      setPhone(`+91 98${randomSuffix} 10293`);
      setBloodGroup('A+');
      setAllergies('');
      setEmergencyContactName('');
      setEmergencyContactPhone('');
    }
    setStep(1);
    setBiometricsDone(false);
    setBiometricType(null);
    setBiometricCredId('');
    setBiometricStatusMsg('');
    setView('onboarding');
  };

  // Step 5 created persona state
  const [createdPersona, setCreatedPersona] = useState<PatientPersona | null>(null);
  const [isConfirmedOnChain, setIsConfirmedOnChain] = useState(false);

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    // Auto-focus next input
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleStartBiometricScan = async (forcedMode?: 'hardware' | 'virtual') => {
    const chosenMode = forcedMode || biometricEnrollMode;
    setIsScanningBiometrics(true);

    if (chosenMode === 'hardware') {
      setBiometricStatusMsg('Prompting host device hardware sensor (Touch ID / Windows Hello)...');
    } else {
      setBiometricStatusMsg('Scanning virtual fingerprint scanner & deriving cryptographic minutiae...');
    }

    try {
      let customCredId: string | undefined;
      let fingerLabel = 'Virtual Multi-Patient Fingerprint';

      if (chosenMode === 'virtual') {
        // Small delay to simulate realistic physical scanner interaction
        await new Promise((r) => setTimeout(r, 650));

        if (selectedVirtualFinger === 'unique-fresh') {
          customCredId = `SIM-FP-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString().slice(-4)}`;
          fingerLabel = `Patient ${name || 'Walk-in'} Primary Fingerprint`;
        } else {
          customCredId = selectedVirtualFinger;
          fingerLabel = selectedVirtualFinger.replace('sim-', '').replace('-', ' ').toUpperCase();
        }
      }

      const res = await registerDeviceBiometric({
        userName: name.trim() || 'New Patient',
        userEmail: phone.trim() || `user-${Date.now()}@medivault.id`,
        forceFreshRegistration: true,
        enrollmentMode: chosenMode,
        fingerLabel,
        customCredentialId: customCredId
      });

      if (res.success) {
        setBiometricsDone(true);
        setBiometricType(res.authenticatorType);
        if (res.credentialId) setBiometricCredId(res.credentialId);
        setBiometricStatusMsg(
          res.authenticatorType === 'platform-hardware'
            ? '✓ Touch ID device hardware scanner verified & registered with cryptographic enclave!'
            : `✓ Virtual Biometric verified (${fingerLabel})! Cryptographic minutiae registered in enclave.`
        );
      } else if (res.cancelled) {
        setBiometricStatusMsg('Biometric scan prompt was dismissed. You can retry with your device sensor or use the virtual scanner.');
      } else {
        setBiometricStatusMsg(res.error || 'Biometric scan could not complete.');
      }
    } catch (err: any) {
      setBiometricStatusMsg('Biometric sensor error: ' + (err.message || 'Unknown'));
    } finally {
      setIsScanningBiometrics(false);
    }
  };

  const handleLandingBiometricLogin = async () => {
    setIsScanningDeviceBio(true);
    setLandingBioToast('Please touch your fingerprint sensor (Touch ID / Windows Hello)...');
    try {
      const res = await scanDeviceBiometric();
      if (res.success) {
        const currentPatient = await mockApi.getCurrentPatient();
        if (currentPatient) {
          setLandingBioToast(`✓ Touch ID Verified for ${currentPatient.name}! Unlocking vault...`);
          setTimeout(() => {
            onCompleteOnboarding();
          }, 800);
          return;
        } else {
          setLandingBioToast('Biometric verified! Setting up your new sovereign MediVault...');
          setTimeout(() => {
            setView('onboarding');
            setStep(1);
            setBiometricsDone(true);
            setBiometricType(res.authenticatorType);
          }, 800);
        }
      } else if (res.cancelled) {
        setLandingBioToast('Touch ID scan was cancelled.');
        setTimeout(() => setLandingBioToast(null), 3000);
      } else {
        setLandingBioToast(res.error || 'Biometric verification failed.');
        setTimeout(() => setLandingBioToast(null), 3000);
      }
    } catch (err: any) {
      setLandingBioToast('Biometric sensor unavailable: ' + (err?.message || 'Error'));
      setTimeout(() => setLandingBioToast(null), 3000);
    } finally {
      setIsScanningDeviceBio(false);
    }
  };

  const handleFinalizeVault = async () => {
    setIsSubmittingVault(true);
    try {
      const patientName = name.trim() || 'Priya Sharma';
      const patientPhone = phone.trim() || '+91 98112 34567';
      const res = await mockApi.registerNewPatient({
        name: patientName,
        dob: dob || '1995-06-20',
        gender,
        phone: patientPhone,
        bloodGroup,
        allergies: allergies ? allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        conditions: [],
        emergencyContact: {
          name: emergencyContactName.trim() || 'Primary Emergency Contact',
          relation: 'Family',
          phone: emergencyContactPhone.trim() || patientPhone
        },
        biometricCredentialId: biometricCredId || undefined,
        biometricRegistered: biometricsDone,
        sensorType:
          biometricType === 'platform-hardware'
            ? 'Hardware Touch ID Platform Authenticator'
            : 'Virtual Enclave Optical Scanner (FIDO2)',
        dnaReferenceId: `DNA-LAB-${Math.floor(100000 + Math.random() * 900000)}`,
        issuingLaboratory: 'National Genomics Center (NABL)',
        registeredBy: 'patient',
        actorName: patientName
      });

      setCreatedPersona(res.persona);
      setCreatedTxHash(res.txHash);
      setStep(5);

      // Simulate "Pending on-chain" -> "Confirmed" after 1.5 seconds
      setTimeout(() => {
        setIsConfirmedOnChain(true);
      }, 1500);
    } finally {
      setIsSubmittingVault(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {view === 'landing' ? (
        /* LANDING VIEW */
        <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full animate-fade-in">
          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shadow-md">
                <img src="/logo.png" alt="MediVault Emblem" className="w-full h-full object-contain" />
              </div>
              <img src="/logo-brand.png" alt="MEDiVault Logo" className="h-10 sm:h-12 object-contain dark:brightness-125 dark:bg-white/95 dark:px-3 dark:py-1 dark:rounded-xl shadow-xs" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Next-Gen Sovereign Health Identity</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Your health records.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600">
                Your consent.
              </span>{' '}
              Provably yours.
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              MediVault combines biometric passkey encryption with a Polygon blockchain audit trail. Keep complete sovereignty over your medical history without sacrificing emergency care speed.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <button
                onClick={handleLandingBiometricLogin}
                disabled={isScanningDeviceBio}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-base shadow-lg shadow-emerald-700/25 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isScanningDeviceBio ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Scanning Touch ID...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 text-emerald-200" />
                    <span>Scan Fingerprint to Unlock</span>
                  </>
                )}
              </button>

              <button
                onClick={() => startCreateNewVault()}
                className="px-8 py-4 rounded-2xl bg-teal-800/80 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-900/20 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>Create New Vault</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={onGoHospitalLogin}
                className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-base border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-all"
              >
                <Building2 className="w-5 h-5 text-teal-600" />
                <span>Hospital Portal</span>
              </button>

              {onGoAdminLogin && (
                <button
                  onClick={onGoAdminLogin}
                  className="px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base border border-slate-700 shadow-sm flex items-center gap-3 transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  <span>Admin & Governance</span>
                </button>
              )}

              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="px-8 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold text-base border border-indigo-200 dark:border-indigo-800 shadow-sm flex items-center gap-3 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Scan MediID QR</span>
                </button>
              )}
            </div>

            {/* Live Biometric Sensor Status Toast */}
            {landingBioToast && (
              <div className="p-3 bg-teal-950/90 border border-teal-500/40 text-teal-100 rounded-xl text-xs font-mono max-w-md mx-auto flex items-center justify-center gap-2 shadow-lg animate-fade-in">
                <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                <span>{landingBioToast}</span>
              </div>
            )}
          </div>

          {/* Trust Strip */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white max-w-4xl mx-auto shadow-xl border border-slate-800 flex items-center justify-center gap-3 text-center text-xs font-mono">
            <Lock className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Only SHA-256 integrity hashes go on-chain. Never your personal health data.</span>
          </div>

          {/* 3-Step Explainer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Own Your Data</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                All prescriptions, lab reports, and self-declared logs are encrypted client-side using device hardware biometrics.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Granular Consent</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Grant hospitals 1-hour to 7-day access tiers (Emergency Profile vs Full History) with instant real-time revocation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Immutable Verification</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Detect unauthorized record modifications or hospital tampering instantly using cryptographic zero-knowledge hashes.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 5-STEP ONBOARDING FLOW */
        <div className="max-w-2xl mx-auto w-full py-8 px-4 space-y-6 animate-fade-in">
          {/* Top Stepper Header */}
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {step === 5 ? 'Vault Enrolment Complete' : 'Create Sovereign MediVault'}
            </h2>
            <p className="text-xs text-slate-500">Step {step} of 5 — Cryptographic identity creation</p>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all duration-500"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            {/* STEP 1: Basic Details */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">1. Patient Profile Details</h3>
                    <p className="text-xs text-slate-500">Enter patient demographic data or pick a quick test persona</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Fill:</span>
                    <button
                      type="button"
                      onClick={() => startCreateNewVault('priya')}
                      className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-[11px] font-medium border border-teal-200 dark:border-teal-800 hover:bg-teal-100"
                    >
                      Priya Sharma
                    </button>
                    <button
                      type="button"
                      onClick={() => startCreateNewVault('arjun')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                    >
                      Dr. Arjun
                    </button>
                    <button
                      type="button"
                      onClick={() => startCreateNewVault('clean')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Mobile Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Blood Group</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Known Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts, Sulfa"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Emergency Contact Person</label>
                      <input
                        type="text"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Emergency Contact Phone</label>
                      <input
                        type="text"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2"
                  >
                    <span>Proceed to OTP Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: OTP (6 Boxes) */}
            {step === 2 && (
              <div className="space-y-6 text-center animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">2. Mobile OTP Verification</h3>
                  <p className="text-xs text-slate-500 mt-1">Sent to {phone}. Mock accepts any 6-digit code.</p>
                </div>

                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otp.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono font-bold text-xl rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  ))}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2"
                  >
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Fingerprint Enrolment */}
            {step === 3 && (
              <div className="space-y-6 text-center animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">3. Device Fingerprint Hardware Enrolment</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Every new MediVault user must enrol their device biometric scanner (Touch ID / Windows Hello) to encrypt their master vault key.
                  </p>
                </div>

                {/* Biometric Enrolment Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div
                    onClick={() => setBiometricEnrollMode('virtual')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      biometricEnrollMode === 'virtual'
                        ? 'bg-teal-50/80 dark:bg-teal-950/60 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-teal-600" />
                        Virtual Triage Scanner
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                        Multi-Patient
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Simulates physical optical scanner. Creates unique patient templates without locking to your host laptop Keychain.
                    </p>
                  </div>

                  <div
                    onClick={() => setBiometricEnrollMode('hardware')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      biometricEnrollMode === 'hardware'
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-indigo-600" />
                        Host Touch ID / Hello
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        Hardware Passkey
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Uses genuine macOS Touch ID / Windows Hello WebAuthn. Prompts to save passkey in your laptop's Passwords.
                    </p>
                  </div>
                </div>

                {/* Sub-selector when in Virtual mode */}
                {biometricEnrollMode === 'virtual' && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl text-left text-xs space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Select Patient Fingerprint Profile / Sensor Contact:
                    </label>
                    <select
                      value={selectedVirtualFinger}
                      onChange={(e) => setSelectedVirtualFinger(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      <option value="unique-fresh">✨ Generate Fresh Unique Fingerprint (Recommended for new patient)</option>
                      <option value="sim-right-thumb">Right Thumb (Preset: Rajesh Kumar)</option>
                      <option value="sim-left-thumb">Left Thumb (Preset: Ananya Sharma)</option>
                      <option value="sim-right-index">Right Index (Preset: Vikram Malhotra)</option>
                    </select>
                  </div>
                )}

                {/* Animated Fingerprint Box */}
                <div className="relative w-36 h-36 mx-auto rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-2xl">
                  {isScanningBiometrics && (
                    <div className="absolute inset-x-0 h-1 bg-emerald-400 shadow-glow-teal animate-scan-line z-20" />
                  )}

                  <Fingerprint
                    className={`w-20 h-20 transition-all duration-300 ${
                      biometricsDone
                        ? 'text-emerald-400 scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : isScanningBiometrics
                        ? 'text-teal-400 animate-pulse'
                        : 'text-slate-600'
                    }`}
                  />
                </div>

                {/* Status message */}
                {biometricStatusMsg && (
                  <p className="text-xs font-mono text-teal-300 max-w-sm mx-auto bg-slate-900/90 p-2.5 rounded-xl border border-teal-500/30">
                    {biometricStatusMsg}
                  </p>
                )}

                <div className="space-y-3">
                  {!biometricsDone ? (
                    <button
                      onClick={() => handleStartBiometricScan()}
                      disabled={isScanningBiometrics}
                      className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-xl flex items-center gap-3 mx-auto disabled:opacity-50 cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
                    >
                      {isScanningBiometrics ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>
                            {biometricEnrollMode === 'hardware'
                              ? 'Prompting Host Touch ID...'
                              : 'Scanning Virtual Enclave Fingerprint...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-5 h-5 text-emerald-200" />
                          <span>
                            {biometricEnrollMode === 'hardware'
                              ? 'Scan Host Touch ID Passkey'
                              : 'Scan & Enroll Patient Fingerprint'}
                          </span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 max-w-sm mx-auto shadow-md">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          {biometricType === 'platform-hardware'
                            ? 'Touch ID Host Hardware Enclave Enrolled!'
                            : 'Patient Biometric Cryptographic Enclave Enrolled!'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleStartBiometricScan()}
                        className="text-[11px] text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-scan / Change Biometric
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                  <button onClick={() => setStep(2)} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                    Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={!biometricsDone}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
                  >
                    <span>Proceed to DNA Hash</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DNA Reference (Optional) */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Dna className="w-5 h-5 text-indigo-600" />
                    <span>4. DNA Reference Hash (Optional Prototype)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Stores only a 256-bit salted hash for future genetic record anchoring.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Salted Genomic Sequence Hash</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                      Salted SHA-256
                    </span>
                  </div>
                  <input
                    type="text"
                    value={dnaSaltedHash}
                    onChange={(e) => setDnaSaltedHash(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    Prototype disclaimer: Genomic sequences are never stored raw. Only irreversible hashes are kept.
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button onClick={() => setStep(3)} className="text-xs text-slate-500">Back</button>
                  <button
                    onClick={handleFinalizeVault}
                    disabled={isSubmittingVault}
                    className="px-8 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSubmittingVault ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Anchoring Vault On-Chain...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Create Vault On-Chain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Vault Created Reveal */}
            {step === 5 && createdPersona && (
              <div className="space-y-6 text-center animate-fade-in">
                <div className="space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">MediVault Initialized!</h3>
                  <p className="text-xs text-slate-500">Your health ID card and blockchain anchor are live.</p>
                </div>

                {/* Health ID Card Display */}
                <HealthIdCard persona={createdPersona} />

                {/* Pending / Confirmed On-Chain Status */}
                <div className="pt-2">
                  <PendingChainChip
                    isConfirmed={isConfirmedOnChain}
                    txHash={createdTxHash}
                  />
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      alert('MediVault Health ID Card downloaded as PDF image payload.');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-300 dark:border-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download ID Card</span>
                  </button>

                  <button
                    onClick={onCompleteOnboarding}
                    className="px-8 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
                  >
                    <span>Enter Patient Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
