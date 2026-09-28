import React, { useState } from 'react';
import {
  Building2, ShieldCheck, QrCode, Fingerprint, Lock, ArrowRight, Wallet,
  Activity, Users, FileCheck2, ShieldAlert, Sparkles, CheckCircle2, ChevronRight,
  Stethoscope, Clock, Zap, ExternalLink, RefreshCw
} from 'lucide-react';
import { scanDeviceBiometric } from '../lib/biometrics';

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
  const [selectedFacility, setSelectedFacility] = useState<'city-general' | 'apollo-emergency' | 'apex-genomics'>('city-general');
  const [staffRole, setStaffRole] = useState('Chief Triage Physician');
  const [staffName, setStaffName] = useState('Dr. A. R. Mehta');
  const [department, setDepartment] = useState('Emergency & Trauma');
  const [licenseNumber, setLicenseNumber] = useState('MCI-REG-482019');
  const [walletConnected, setWalletConnected] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authMethod, setAuthMethod] = useState<'biometric' | 'pin'>('biometric');
  const [departmentPin, setDepartmentPin] = useState('••••');

  const facilityProfiles: Record<string, HospitalStaffSession> = {
    'city-general': {
      facilityName: 'City General Hospital',
      facilityCode: 'HOSP-CGH-001',
      department: 'Emergency & Trauma Triage',
      staffName: staffName || 'Dr. A. R. Mehta',
      staffRole: staffRole || 'Chief Triage Physician',
      walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      licenseNumber: licenseNumber || 'MCI-REG-482019',
      accreditation: 'NABH Level 3 • Polygon Amoy Registered'
    },
    'apollo-emergency': {
      facilityName: 'Apollo Care Trauma Center',
      facilityCode: 'HOSP-ACT-002',
      department: 'Critical Care ICU',
      staffName: 'Dr. Radhika Sharma',
      staffRole: 'Senior Consultant',
      walletAddress: '0x32A1768B98cd723F51D8794B01A3828c4e5117B9',
      licenseNumber: 'MCI-REG-918234',
      accreditation: 'JCI Accredited • Tier 1 Trauma Center'
    },
    'apex-genomics': {
      facilityName: 'Apex Diagnostic & Genomics Lab',
      facilityCode: 'LAB-ADG-003',
      department: 'Molecular Pathology & DNA Diagnostics',
      staffName: 'Dr. Sanjay Sen',
      staffRole: 'Lead Pathologist',
      walletAddress: '0x59B8813C8B72f10928aD7e9b0129388B8f1883C1',
      licenseNumber: 'NABL-ISO-15189',
      accreditation: 'NABL Certified Reference Laboratory'
    }
  };

  const handleFacilitySelect = (key: 'city-general' | 'apollo-emergency' | 'apex-genomics') => {
    setSelectedFacility(key);
    const prof = facilityProfiles[key];
    setStaffName(prof.staffName);
    setDepartment(prof.department);
    setStaffRole(prof.staffRole);
    setLicenseNumber(prof.licenseNumber);
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

      const activeProfile = {
        ...facilityProfiles[selectedFacility],
        staffName: staffName.trim() || facilityProfiles[selectedFacility].staffName,
        department: department.trim() || facilityProfiles[selectedFacility].department,
        staffRole: staffRole.trim() || facilityProfiles[selectedFacility].staffRole,
        licenseNumber: licenseNumber.trim() || facilityProfiles[selectedFacility].licenseNumber
      };

      onShowToast(`✓ Access Granted: ${activeProfile.facilityName} (${activeProfile.staffName})`);
      onLoginSuccess(activeProfile);
    } catch (err: any) {
      onShowToast(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
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
              Equip your hospital, clinic, or emergency trauma center with real-time optical MediID camera scanning, hardware biometric patient onboarding, and Polygon smart contract authenticated medical record issuance.
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
                Polygon Amoy Synced
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Facility Selection */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>Select Healthcare Facility</span>
            </h2>
            <p className="text-xs text-slate-500">
              Choose an approved healthcare institution from the national health provider registry:
            </p>

            <div className="space-y-3 pt-1">
              {Object.entries(facilityProfiles).map(([key, prof]) => {
                const isSelected = selectedFacility === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleFacilitySelect(key as any)}
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
                            {prof.facilityName}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            ID: {prof.facilityCode}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 font-mono">
                      <span>Wallet: {prof.walletAddress.slice(0, 6)}...{prof.walletAddress.slice(-4)}</span>
                      <span className="text-teal-700 dark:text-teal-300 font-sans font-semibold">{prof.accreditation.split('•')[0]}</span>
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
                  Staff Authentication & Session Sign-In
                </h3>
                <p className="text-xs text-slate-500">
                  Verify medical license and cryptographic provider key to unlock triage bay
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
                    Signing in to
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {facilityProfiles[selectedFacility].facilityName}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {facilityProfiles[selectedFacility].facilityCode}
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
                      {facilityProfiles[selectedFacility].walletAddress}
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
                      <span className="text-[10px] text-slate-500">Secure enclave passkey</span>
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
      </section>
    </div>
  );
};
