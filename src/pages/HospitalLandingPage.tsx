import React, { useState } from 'react';
import {
  Building2, ShieldCheck, QrCode, Fingerprint, Lock, ArrowRight, Wallet,
  Activity, Users, FileCheck2, ShieldAlert, Sparkles, CheckCircle2, ChevronRight,
  Stethoscope, Clock, Zap, ExternalLink, RefreshCw, Plus, Send
} from 'lucide-react';
import { scanDeviceBiometric } from '../lib/biometrics';

import { mockApi } from '../mock/api';
import { Hospital } from '../mock/types';

export interface HospitalStaffSession {
  facilityName: string;
  facilityCode: string;
  department: string;
  staffName: string;
  staffRole: string;
  walletAddress: string;
  licenseNumber: string;
  accreditation: string;
}

interface HospitalLandingPageProps {
  onLoginSuccess: (session: HospitalStaffSession) => void;
  onGoBack: () => void;
  onOpenScanner?: () => void;
  onShowToast: (msg: string) => void;
}

export const HospitalLandingPage: React.FC<HospitalLandingPageProps> = ({
  onLoginSuccess,
  onGoBack,
  onOpenScanner,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'request'>('login');
  const [hospitalsList, setHospitalsList] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('hosp-01');

  const [staffRole, setStaffRole] = useState('Chief Triage Physician');
  const [staffName, setStaffName] = useState('Dr. A. R. Mehta');
  const [department, setDepartment] = useState('Emergency & Trauma');
  const [licenseNumber, setLicenseNumber] = useState('MCI-REG-482019');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'pin'>('biometric');

  // Request new hospital account states
  const [reqFacilityName, setReqFacilityName] = useState('');
  const [reqDepartment, setReqDepartment] = useState('General Medicine & Emergency');
  const [reqStaffName, setReqStaffName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqLicense, setReqLicense] = useState('');
  const [reqAccreditation, setReqAccreditation] = useState('NABH Accredited Tertiary Center');
  const [reqWallet, setReqWallet] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmittedSuccess, setRequestSubmittedSuccess] = useState(false);

  const loadHospitals = async () => {
    const list = await mockApi.getHospitals();
    setHospitalsList(list);
    const approved = list.filter((h) => h.status === 'Approved');
    if (approved.length > 0 && !approved.some((h) => h.id === selectedHospitalId)) {
      setSelectedHospitalId(approved[0].id);
    }
  };

  React.useEffect(() => {
    loadHospitals();
  }, []);

  const approvedHospitals = hospitalsList.filter((h) => h.status === 'Approved');
  const currentHospital = approvedHospitals.find((h) => h.id === selectedHospitalId) || approvedHospitals[0] || {
    id: 'hosp-01',
    name: 'City General Hospital',
    facilityCode: 'HOSP-CGH-001',
    walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    department: 'Emergency & Trauma Triage',
    accreditation: 'NABH Level 3 • MST Testnet Registered'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      if (authMethod === 'biometric') {
        onShowToast('Authenticating hospital staff hardware passkey...');
        const bioRes = await scanDeviceBiometric();
        if (!bioRes.success) {
          onShowToast('Biometric authentication failed. Please retry or use Department PIN.');
          setIsAuthenticating(false);
          return;
        }
      }

      const activeProfile: HospitalStaffSession = {
        facilityName: currentHospital.name,
        facilityCode: currentHospital.facilityCode || `HOSP-${currentHospital.id.slice(-4).toUpperCase()}`,
        department: department.trim() || currentHospital.department || 'Emergency & Trauma Triage',
        staffName: staffName.trim() || 'Dr. A. R. Mehta',
        staffRole: staffRole.trim() || 'Chief Triage Physician',
        walletAddress: currentHospital.walletAddress,
        licenseNumber: licenseNumber.trim() || 'MCI-REG-482019',
        accreditation: currentHospital.accreditation || 'NABH Level 3'
      };

      onShowToast(`✓ Access Granted: ${activeProfile.facilityName} (${activeProfile.staffName})`);
      onLoginSuccess(activeProfile);
    } catch (err: any) {
      onShowToast(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqFacilityName.trim() || !reqStaffName.trim() || !reqEmail.trim()) {
      onShowToast('Please fill in all required institutional details');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const created = await mockApi.requestHospitalRegistration({
        facilityName: reqFacilityName.trim(),
        department: reqDepartment.trim(),
        staffName: reqStaffName.trim(),
        contactEmail: reqEmail.trim(),
        licenseNumber: reqLicense.trim() || `MCI-REG-${Math.floor(100000 + Math.random() * 900000)}`,
        accreditation: reqAccreditation.trim(),
        walletAddress: reqWallet.trim() || undefined
      });
      setRequestSubmittedSuccess(true);
      onShowToast(`Registration request sent for ${created.name}! Sent to Admin for review.`);
      await loadHospitals();
    } catch (err: any) {
      onShowToast('Failed to submit request: ' + (err?.message || 'Error'));
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-fade-in">
      {/* Institutional Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-900/10 via-slate-900/5 to-transparent dark:from-teal-950/40 dark:via-slate-950/60 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-5 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>MediVault Institutional Healthcare Gateway</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Instant Triage.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-indigo-600">
                Sovereign Consent.
              </span>{' '}
              Zero Friction.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Equip your hospital, clinic, or emergency trauma center with real-time optical MediID camera scanning, hardware biometric patient onboarding, and MST smart contract authenticated medical record issuance.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              {onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Launch Optical Camera Scanner</span>
                </button>
              )}

              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-800 transition-all cursor-pointer"
              >
                Back to Citizen Portal
              </button>
            </div>
          </div>

          {/* Quick Facility Card Highlights */}
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Institutional Node Status
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MST Testnet Synced
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Contactless Optical Triage</span>
                    <span className="text-[11px] text-slate-500">Scan patient MediID in under 0.8s</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Desk Hardware Biometrics</span>
                    <span className="text-[11px] text-slate-500">Enroll new walk-in patient passkeys</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Emergency Break-Glass</span>
                    <span className="text-[11px] text-slate-500">Life-saving audit-logged overrides</span>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Authentication & Facility Portal Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Mode Tabs: Login vs Request New Account */}
        <div className="max-w-md mx-auto mb-8 p-1.5 rounded-2xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setRequestSubmittedSuccess(false);
            }}
            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Login as Hospital</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'request'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Request New Account</span>
          </button>
        </div>

        {activeTab === 'login' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left: Facility Selection */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  <span>Approved Healthcare Facilities ({approvedHospitals.length})</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Choose an accredited healthcare facility approved by the National Health Authority:
              </p>

              <div className="space-y-3 pt-1 max-h-[460px] overflow-y-auto pr-1">
                {approvedHospitals.map((hosp) => {
                  const isSelected = selectedHospitalId === hosp.id;
                  return (
                    <div
                      key={hosp.id}
                      onClick={() => setSelectedHospitalId(hosp.id)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-teal-50/90 dark:bg-teal-950/60 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${
                              isSelected
                                ? 'bg-teal-700 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {hosp.name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-500">
                              ID: {hosp.facilityCode || `HOSP-${hosp.id.slice(-4).toUpperCase()}`}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        )}
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono">
                        <span>Wallet: {hosp.walletAddress.slice(0, 6)}...{hosp.walletAddress.slice(-4)}</span>
                        <span className="text-teal-700 dark:text-teal-300 font-sans font-semibold">
                          {hosp.accreditation || 'NABH Accredited'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compliance Badge */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <p className="text-indigo-900 dark:text-indigo-200 text-[11px] leading-relaxed">
                  Complies with Ayushman Bharat Digital Mission (ABDM), HL7 FHIR R4 interoperability, and ISO 27799 health data standards.
                </p>
              </div>
            </div>

            {/* Right: Staff Credentials & Authentication Gate */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Hospital Staff Authentication
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify clinical credentials and hardware passkey to unlock hospital emergency triage
                  </p>
                </div>

                <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                {/* Active Facility Tag */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Selected Facility
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {currentHospital.name}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {currentHospital.facilityCode || `HOSP-${currentHospital.id.slice(-4).toUpperCase()}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Practitioner / Staff Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department / Triage Unit *
                    </label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Medical Council / License No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Designated Clinical Role
                    </label>
                    <select
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Chief Triage Physician">Chief Triage Physician</option>
                      <option value="Emergency Room Resident">Emergency Room Resident</option>
                      <option value="Registered Nurse / Triage Registrar">Registered Nurse / Triage Registrar</option>
                      <option value="Clinical Pathologist">Clinical Pathologist</option>
                      <option value="Paramedic / EMS First Responder">Paramedic / EMS First Responder</option>
                    </select>
                  </div>
                </div>

                {/* Hardware Wallet Status */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        Institutional Signer Wallet
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {currentHospital.walletAddress}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                    Ready to Sign
                  </span>
                </div>

                {/* Authentication Method Toggles */}
                <div className="space-y-2 pt-1">
                  <span className="block font-bold text-slate-700 dark:text-slate-300">
                    Staff Identity Verification Method:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('biometric')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        authMethod === 'biometric'
                          ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-900 dark:text-teal-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Fingerprint className="w-4 h-4 text-teal-600" />
                      <div>
                        <span className="font-bold block text-xs">Device Touch ID / FIDO2</span>
                        <span className="text-[10px] text-slate-500">Physical biometric passkey</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMethod('pin')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        authMethod === 'pin'
                          ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-900 dark:text-teal-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-indigo-600" />
                      <div>
                        <span className="font-bold block text-xs">Department PIN</span>
                        <span className="text-[10px] text-slate-500">Hospital duty access code</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-lg shadow-teal-700/20 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isAuthenticating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Institutional Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Enter Hospital Triage & Clinical Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* TAB 2: REQUEST NEW HOSPITAL ACCOUNT */
          <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-fade-in">
            <div className="text-center space-y-2 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto shadow-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Request Hospital Network Authorization
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Submit your institution's credentials for verification. Upon review, the National Health Authority Admin will grant on-chain cryptographic access.
              </p>
            </div>

            {requestSubmittedSuccess ? (
              <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center space-y-4 animate-fade-in">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Registration Request Dispatched!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Your institutional application for <span className="font-bold text-teal-700 dark:text-teal-300">{reqFacilityName}</span> has been logged under pending status on the national registry. The Level 5 Authority Admin has been notified for review and approval.
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setRequestSubmittedSuccess(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs"
                  >
                    Return to Hospital Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Healthcare Facility / Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fortis Memorial Research Institute"
                    value={reqFacilityName}
                    onChange={(e) => setReqFacilityName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Supervising Physician / Applicant Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajeshwari Rao"
                      value={reqStaffName}
                      onChange={(e) => setReqStaffName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Official Institutional Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="triage@fortismemorial.org"
                      value={reqEmail}
                      onChange={(e) => setReqEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Department
                    </label>
                    <input
                      type="text"
                      value={reqDepartment}
                      onChange={(e) => setReqDepartment(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Medical Establishment License No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HOSP-LIC-2026-981"
                      value={reqLicense}
                      onChange={(e) => setReqLicense(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Accreditation Level
                    </label>
                    <select
                      value={reqAccreditation}
                      onChange={(e) => setReqAccreditation(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="NABH Accredited Tertiary Center">NABH Accredited Tertiary Center</option>
                      <option value="JCI International Accredited">JCI International Accredited</option>
                      <option value="State Govt Hospital / Trauma Center">State Govt Hospital / Trauma Center</option>
                      <option value="NABL Certified Diagnostics Laboratory">NABL Certified Diagnostics Laboratory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Institution Wallet (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="0x... (auto-generated if blank)"
                      value={reqWallet}
                      onChange={(e) => setReqWallet(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingRequest}
                    className="w-full py-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingRequest ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting Request to Governance Admin...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Registration Request for Admin Approval</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
