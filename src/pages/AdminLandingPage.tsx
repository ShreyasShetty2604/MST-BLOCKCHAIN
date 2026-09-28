import React, { useState } from 'react';
import {
  ShieldAlert, ShieldCheck, Lock, ArrowRight, KeyRound, Building2,
  Activity, TrendingUp, CheckCircle2, AlertTriangle, Fingerprint,
  RefreshCw, Globe2, FileCode, Users, Cpu, ExternalLink
} from 'lucide-react';
import { scanDeviceBiometric, registerDeviceBiometric } from '../lib/biometrics';

export interface AdminOfficerSession {
  officerName: string;
  department: string;
  designation: string;
  badgeNumber: string;
  clearanceLevel: string;
  governanceWallet: string;
  authorityAgency: string;
}

interface AdminLandingPageProps {
  onLoginSuccess: (session: AdminOfficerSession) => void;
  onGoBack: () => void;
  onShowToast: (msg: string) => void;
}

export const AdminLandingPage: React.FC<AdminLandingPageProps> = ({
  onLoginSuccess,
  onGoBack,
  onShowToast
}) => {
  const [selectedRole, setSelectedRole] = useState<'director' | 'auditor' | 'multisig'>('director');
  const [officerName, setOfficerName] = useState('Dr. S. K. Swaminathan');
  const [badgeNumber, setBadgeNumber] = useState('GOV-NDHM-9014');
  const [securityPin, setSecurityPin] = useState('••••••');
  const [isVerifying, setIsVerifying] = useState(false);
  const [hardwareKeyDetected, setHardwareKeyDetected] = useState(true);

  const authorityProfiles: Record<string, AdminOfficerSession> = {
    director: {
      officerName: officerName || 'Dr. S. K. Swaminathan',
      department: 'National Digital Health Mission (ABDM)',
      designation: 'Director General of Health Informatics',
      badgeNumber: badgeNumber || 'GOV-NDHM-9014',
      clearanceLevel: 'Level 5 Sovereign Authority',
      governanceWallet: '0x98F2618A12bc4E10F928A00918B734891C881F23',
      authorityAgency: 'Ministry of Health & Family Welfare'
    },
    auditor: {
      officerName: 'Meenakshi Sundaram',
      department: 'Medical Privacy & Cryptographic Integrity Cell',
      designation: 'Chief Audit Officer (Zero-Knowledge Telemetry)',
      badgeNumber: 'GOV-AUDIT-3104',
      clearanceLevel: 'Level 4 Cryptographic Investigator',
      governanceWallet: '0x44B1829D81aF210488Cc891B0012A34591F771B8',
      authorityAgency: 'National Health Authority (NHA)'
    },
    multisig: {
      officerName: 'Consortium Key Signer #3',
      department: 'Polygon Amoy Health Consortium DAO',
      designation: 'Smart Contract Multi-Sig Validator',
      badgeNumber: 'DAO-VAL-8821',
      clearanceLevel: 'Protocol Multi-Sig Admin',
      governanceWallet: '0x11C9002E71aD829B66F71239812A81B098711E92',
      authorityAgency: 'Sovereign Node Governance Board'
    }
  };

  const handleRoleSelect = (key: 'director' | 'auditor' | 'multisig') => {
    setSelectedRole(key);
    const prof = authorityProfiles[key];
    setOfficerName(prof.officerName);
    setBadgeNumber(prof.badgeNumber);
  };

  const [passkeyEnrolled, setPasskeyEnrolled] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'create_passkey'>('signin');

  const handleCreateAdminPasskey = async () => {
    setIsRegisteringPasskey(true);
    try {
      onShowToast('Registering new Sovereign Admin Passkey on device hardware enclave...');
      const res = await registerDeviceBiometric({
        userName: officerName.trim() || 'Admin Officer',
        userEmail: badgeNumber.trim() || 'admin-officer@nha.gov.in',
        forceFreshRegistration: true
      });
      if (res.success) {
        setPasskeyEnrolled(true);
        // Persist admin passkey binding in localStorage
        const storedPasskeys = JSON.parse(localStorage.getItem('medivault2_admin_passkeys') || '{}');
        storedPasskeys[badgeNumber.trim()] = {
          officerName: officerName.trim(),
          credentialId: res.credentialId,
          registeredAt: new Date().toISOString()
        };
        localStorage.setItem('medivault2_admin_passkeys', JSON.stringify(storedPasskeys));
        onShowToast('✓ Sovereign Admin Passkey successfully enrolled on this device!');
        setAuthMode('signin');
      } else if (res.cancelled) {
        onShowToast('Passkey registration prompt cancelled.');
      } else {
        onShowToast(res.error || 'Failed to create passkey.');
      }
    } catch (err: any) {
      onShowToast('Passkey enrollment error: ' + (err?.message || 'Error'));
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeNumber.trim()) {
      onShowToast('Please provide your Government Badge / Admin User ID');
      return;
    }
    setIsVerifying(true);

    try {
      onShowToast('Prompting Government FIDO2 Hardware Passkey verification...');
      const bioRes = await scanDeviceBiometric();
      if (!bioRes.success) {
        onShowToast(bioRes.error || 'Hardware Security Key / Passkey challenge failed.');
        setIsVerifying(false);
        return;
      }

      const activeProfile = {
        ...authorityProfiles[selectedRole],
        officerName: officerName.trim() || authorityProfiles[selectedRole].officerName,
        badgeNumber: badgeNumber.trim() || authorityProfiles[selectedRole].badgeNumber
      };

      onShowToast(`✓ Sovereign Clearance Confirmed: ${activeProfile.officerName}`);
      onLoginSuccess(activeProfile);
    } catch (err: any) {
      onShowToast(err.message || 'Governance sign-in failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-full flex-1 bg-slate-950 text-slate-100 animate-fade-in font-sans">
      {/* Sovereign Governance Header Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950/60 via-slate-950 to-slate-950 border-b border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="space-y-5 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold shadow-inner">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sovereign National Health Authority • Governance Command</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              National Health Registry &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-teal-300 to-emerald-400">
                Cryptographic Telemetry
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Global regulatory oversight for accredited healthcare providers, break-glass misuse auditing, on-chain smart contract protocol management, and zero-knowledge population disease surveillance.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={onGoBack}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm border border-slate-800 transition-all cursor-pointer"
              >
                Back to Public Portal
              </button>
            </div>
          </div>

          {/* Live Consortium Telemetry Snapshot */}
          <div className="w-full max-w-md bg-slate-900/90 rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 font-bold">
                <Globe2 className="w-4 h-4" />
                <span>CONSORTIUM VALIDATORS</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                Chain ID: 80002
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold block">
                  Active Hospitals
                </span>
                <span className="text-emerald-400 font-bold text-lg">24 Whitelisted</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-sans font-semibold block">
                  On-Chain Records
                </span>
                <span className="text-indigo-400 font-bold text-lg">4,120 Anchors</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-950/30 border border-rose-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Break-Glass Overrides: 2 Pending Review</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-rose-400 underline">
                Audit Feed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Authority Clearance Gate Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Authority Role Profiles */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Select Governance Role</span>
            </h2>
            <p className="text-xs text-slate-400">
              Select accredited authority credential to initialize governance session:
            </p>

            <div className="space-y-3 pt-1">
              {Object.entries(authorityProfiles).map(([key, prof]) => {
                const isSelected = selectedRole === key;
                return (
                  <div
                    key={key}
                    onClick={() => handleRoleSelect(key as any)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">
                            {prof.officerName}
                          </h4>
                          <span className="text-[10px] font-mono text-indigo-300">
                            {prof.designation}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800 font-mono">
                      <span>Clearance: {prof.clearanceLevel.split(' ')[0]}</span>
                      <span className="text-indigo-300">{prof.badgeNumber}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hardware Security Standard Note */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
              <Cpu className="w-5 h-5 text-teal-400 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Hardware Enclave Enforced: All administrative transactions require FIDO2 / WebAuthn cryptographic hardware attestation.
              </p>
            </div>
          </div>

          {/* Right: Security Sign-In Panel */}
          <div className="lg:col-span-7 bg-slate-900/90 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Government Authority Sign-In
                </h3>
                <p className="text-xs text-slate-400">
                  Authenticate regulatory officer key to open the National Telemetry Center
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-indigo-950 text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
            </div>

            {/* Mode Selector: Sign-in with Passkey vs Create New Admin Passkey */}
            <div className="p-1 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  authMode === 'signin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Sign In with Passkey</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('create_passkey')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  authMode === 'create_passkey'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Enroll New Admin Passkey</span>
              </button>
            </div>

            {authMode === 'create_passkey' && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 space-y-3 animate-fade-in text-xs">
                <h4 className="font-extrabold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <span>Create Hardware Enclave Passkey for Admin ID</span>
                </h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Bind this device's biometric sensor (Touch ID / Windows Hello) to your Admin ID: <strong className="text-indigo-300 font-mono">{badgeNumber}</strong>. You will be able to sign into the Governance Command Center directly.
                </p>
                <button
                  type="button"
                  onClick={handleCreateAdminPasskey}
                  disabled={isRegisteringPasskey}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {isRegisteringPasskey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Prompting Hardware Sensor...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Enroll Device Passkey Now</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
              {/* Active Officer Identity Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">
                    Authenticated Regulatory Official
                  </span>
                  <span className="font-extrabold text-white text-sm">
                    {authorityProfiles[selectedRole].officerName}
                  </span>
                  <span className="text-[10px] text-indigo-400 block font-mono">
                    {authorityProfiles[selectedRole].department}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {authorityProfiles[selectedRole].badgeNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Officer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Government Badge / Credential ID
                  </label>
                  <input
                    type="text"
                    required
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-Sig Signer Address */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-sans font-bold">Multi-Sig Signer Address</span>
                  <span className="text-emerald-400 font-sans font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Node Whitelisted
                  </span>
                </div>
                <p className="text-xs text-indigo-300 truncate">
                  {authorityProfiles[selectedRole].governanceWallet}
                </p>
              </div>

              {/* Hardware Security Key Check */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-indigo-400" />
                  <div>
                    <span className="font-bold text-white block">
                      FIDO2 Hardware Key / Touch ID
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Physical passkey attestation required for national admin operations
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Ready
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-900/30 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Cryptographic Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter National Governance Command Center</span>
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
