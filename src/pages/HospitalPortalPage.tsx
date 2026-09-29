import React, { useState } from 'react';
import {
  Wallet, Building2, Search, QrCode, ShieldAlert, CheckCircle2, AlertTriangle,
  Clock, Plus, FileText, Send, ShieldCheck, Loader2, X, Activity, User, Lock, UserPlus, Fingerprint, RefreshCw, Dna
} from 'lucide-react';
import { PatientPersona, MedicalRecord } from '../mock/types';
import { ChainBadge } from '../components/ChainBadge';
import { TimelineItem } from '../components/TimelineItem';
import { mockApi } from '../mock/api';
import { registerDeviceBiometric, scanDeviceBiometric } from '../lib/biometrics';
import { CameraQrScannerModal } from '../components/CameraQrScannerModal';
import { HospitalStaffSession } from './HospitalLandingPage';
import { CANONICAL_DOCTORS } from '../data/patientRecords';

interface HospitalPortalPageProps {
  onShowToast: (msg: string) => void;
  session?: HospitalStaffSession | null;
  onLogout?: () => void;
}

export const HospitalPortalPage: React.FC<HospitalPortalPageProps> = ({ onShowToast, session, onLogout }) => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('91-4827-6153-2043');
  const [showQrModal, setShowQrModal] = useState(false);
  const [patient, setPatient] = useState<PatientPersona | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  // Approval status states
  const [accessState, setAccessState] = useState<'none' | 'requesting' | 'approved' | 'break-glass'>('none');
  const [approvedTier, setApprovedTier] = useState<'Tier 1' | 'Tier 2'>('Tier 2');
  const [requestReason, setRequestReason] = useState('Quarterly endocrinology evaluation & HbA1c review');
  const [requestedTier, setRequestedTier] = useState<'Tier 1' | 'Tier 2'>('Tier 2');
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  // Break glass modal states
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassCategory, setBreakGlassCategory] = useState('Acute Respiratory Distress');
  const [breakGlassNotes, setBreakGlassNotes] = useState('Patient brought in unconscious to ER bay 3.');
  const [breakGlassConfirm, setBreakGlassConfirm] = useState(false);
  const [isSubmittingBreakGlass, setIsSubmittingBreakGlass] = useState(false);

  // Register new patient modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('Devendra Prasad');
  const [regDob, setRegDob] = useState('1985-04-12');
  const [regGender, setRegGender] = useState('Male');
  const [regPhone, setRegPhone] = useState('+91 98450 11223');
  const [regEmail, setRegEmail] = useState('devendra.p@example.com');
  const [regBloodGroup, setRegBloodGroup] = useState('O+');
  const [regAllergies, setRegAllergies] = useState('Sulfa Drugs, Shellfish');
  const [regConditions, setRegConditions] = useState('Acute Appendicitis Evaluation, Mild Hypertension');
  const [regEmergencyContact, setRegEmergencyContact] = useState('Meera Prasad');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('+91 98450 11224');
  const [regDnaRef, setRegDnaRef] = useState('DNA-LAB-771920');
  const [regBiometricEnrolled, setRegBiometricEnrolled] = useState(false);
  const [regBiometricScanning, setRegBiometricScanning] = useState(false);
  const [regBiometricCredId, setRegBiometricCredId] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Triage Lookup Mode states: mediId vs fingerprint vs dna
  const [lookupMode, setLookupMode] = useState<'mediId' | 'fingerprint' | 'dna'>('mediId');
  const [dnaInputCode, setDnaInputCode] = useState('0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8fa1b2c3d4e5f6a7b8c9d0e1f2');
  const [isScanningFingerprintTriage, setIsScanningFingerprintTriage] = useState(false);

  const [regBioMode, setRegBioMode] = useState<'virtual' | 'hardware'>('virtual');

  const handleScanHospitalPatientBiometrics = async (modeOverride?: 'virtual' | 'hardware') => {
    const chosenMode = modeOverride || regBioMode;
    setRegBiometricScanning(true);
    try {
      if (chosenMode === 'hardware') {
        onShowToast('Prompting device hardware fingerprint scanner for patient...');
      } else {
        onShowToast('Scanning patient fingerprint on hospital desk scanner...');
      }
      const res = await registerDeviceBiometric({
        userName: regName || 'Walk-in Patient',
        userEmail: regPhone || '+91 98450 11223',
        forceFreshRegistration: true,
        enrollmentMode: chosenMode,
        fingerLabel: `Hospital Patient ${regName || 'Walk-in'} Fingerprint`,
        customCredentialId: chosenMode === 'virtual' ? `HOSP-FP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined
      });
      if (res.success) {
        setRegBiometricEnrolled(true);
        if (res.credentialId) setRegBiometricCredId(res.credentialId);
        onShowToast(
          res.authenticatorType === 'platform-hardware'
            ? '✓ Patient biometric enrolled via Hardware Authenticator!'
            : '✓ Patient biometric template captured via Hospital Triage Scanner!'
        );
      } else if (res.cancelled) {
        onShowToast('Biometric scan prompt cancelled.');
      } else {
        onShowToast(res.error || 'Biometric scan could not complete.');
      }
    } catch (err: any) {
      onShowToast('Biometric error: ' + (err?.message || 'Error'));
    } finally {
      setRegBiometricScanning(false);
    }
  };

  // Add record modal states & dynamic clinical fields
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recTitle, setRecTitle] = useState('HbA1c & Fasting Glucose Report');
  const [recType, setRecType] = useState('Lab Report');
  const [docName, setDocName] = useState('Dr. A. R. Mehta');
  const [recSummary, setRecSummary] = useState('Glycemic parameters show steady improvement.');
  const [customParamKey, setCustomParamKey] = useState('Blood Pressure');
  const [customParamVal, setCustomParamVal] = useState('124/82 mmHg');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('Optimal Glycemic Control');
  const [prescribedRx, setPrescribedRx] = useState('Metformin 500mg PO BD after meals');
  const [isSigningWallet, setIsSigningWallet] = useState(false);

  const handleConnectWallet = () => {
    setWalletConnected(true);
    onShowToast('Connected Hospital Wallet: 0x71C7...976F (City General)');
  };

  const handleSearchPatient = async (idToSearch?: string) => {
    const q = idToSearch || searchQuery;
    if (!q) return;
    const found = await mockApi.getPatientById(q);
    if (!found) {
      onShowToast(`No patient found matching "${q}". You can register them below.`);
      return;
    }
    setPatient(found);
    setAccessState('approved');
    setApprovedTier('Tier 2');
    setShowQrModal(false);
    const patientRecs = await mockApi.getRecords('All', found.id);
    setRecords(patientRecs);
    onShowToast(`Loaded patient profile: ${found.name} (MediID: ${found.mediId})`);
  };

  // Scan patient fingerprint directly for triage lookup
  const [triageFingerChoice, setTriageFingerChoice] = useState<string>('hardware');

  const handleScanPatientFingerprintLookup = async (fingerOverride?: string) => {
    setIsScanningFingerprintTriage(true);
    try {
      const mode = fingerOverride || triageFingerChoice;

      let credId: string | undefined;
      if (mode === 'hardware') {
        onShowToast('Place patient finger on scanner (Touch ID / Hardware FIDO2)...');
        const res = await scanDeviceBiometric();
        if (!res.success) {
          if (res.cancelled) {
            onShowToast('Fingerprint scan cancelled.');
          } else {
            onShowToast(res.error || 'Fingerprint scan failed.');
          }
          return;
        }
        credId = res.credentialId;
      } else if (mode === 'unregistered-test') {
        // Explicit unregistered fingerprint test
        onShowToast('Scanning unrecognized patient finger on optical reader...');
        await new Promise((r) => setTimeout(r, 600));
        credId = `UNKNOWN-FP-${Math.floor(1000 + Math.random() * 9000)}`;
      } else {
        // Virtual preset finger (e.g. sim-right-thumb, sim-left-thumb, sim-right-index)
        onShowToast(`Scanning patient finger template (${mode})...`);
        await new Promise((r) => setTimeout(r, 500));
        credId = mode;
      }

      // Check if fingerprint matches an enrolled patient vault
      let matchedPatient = credId ? await mockApi.getPatientByFingerprint(credId) : null;

      if (matchedPatient) {
        setPatient(matchedPatient);
        setAccessState('approved');
        setApprovedTier('Tier 2');
        const patientRecs = await mockApi.getRecords('All', matchedPatient.id);
        setRecords(patientRecs);
        onShowToast(`✓ Fingerprint Matched! Opened Vault for ${matchedPatient.name} (MediID: ${matchedPatient.mediId})`);
      } else {
        // Fingerprint has NO record in database -> Redirect to New Vault Registration with biometric attached!
        onShowToast('No record found for this fingerprint! Redirecting to New Patient Registration...');
        if (credId) {
          setRegBiometricCredId(credId);
          setRegBiometricEnrolled(true);
        }
        setShowRegisterModal(true);
      }
    } catch (err: any) {
      onShowToast('Fingerprint lookup error: ' + (err?.message || 'Error'));
    } finally {
      setIsScanningFingerprintTriage(false);
    }
  };

  // DNA Sample Code search
  const handleSearchByDna = async () => {
    const code = dnaInputCode.trim();
    if (!code) {
      onShowToast('Please enter a DNA salted hash or lab sample reference');
      return;
    }
    const found = await mockApi.getPatientById(code);
    if (!found) {
      onShowToast(`No genomic vault found for DNA code "${code.slice(0, 16)}...". You can register them below.`);
      return;
    }
    setPatient(found);
    setAccessState('approved');
    setApprovedTier('Tier 2');
    const patientRecs = await mockApi.getRecords('All', found.id);
    setRecords(patientRecs);
    onShowToast(`✓ DNA Match Confirmed! Genomic Vault Loaded: ${found.name}`);
  };

  const handleHospitalRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regDob) return;
    setIsRegistering(true);

    try {
      const res = await mockApi.registerNewPatient({
        name: regName.trim(),
        dob: regDob,
        gender: regGender,
        phone: regPhone.trim(),
        email: regEmail.trim() || `${regName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
        bloodGroup: regBloodGroup,
        allergies: regAllergies ? regAllergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        conditions: regConditions ? regConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
        emergencyContact: {
          name: regEmergencyContact.trim() || 'Primary Contact',
          relation: 'Family',
          phone: regEmergencyPhone.trim() || regPhone.trim() || '+91 98765 00000'
        },
        biometricCredentialId: regBiometricCredId || undefined,
        biometricRegistered: regBiometricEnrolled,
        sensorType: regBiometricEnrolled ? 'Hospital Triage Hardware Scanner' : 'WebAuthn-Enclave-FIDO2',
        dnaReferenceId: regDnaRef.trim() || `DNA-LAB-${Math.floor(100000 + Math.random() * 900000)}`,
        issuingLaboratory: 'City General Clinical Pathology Lab (NABL)',
        registeredBy: 'hospital',
        actorName: 'City General Hospital Triage Desk'
      });

      setPatient(res.persona);
      setAccessState('approved');
      setApprovedTier('Tier 2');
      setShowRegisterModal(false);
      onShowToast(`New Patient Enrolled! MediID: ${res.persona.mediId} anchored on-chain with Tier 2 consent.`);

      const patientRecs = await mockApi.getRecords('All', res.persona.id);
      setRecords(patientRecs);
    } catch (err: any) {
      onShowToast(err.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSendRequest = () => {
    if (!patient) return;
    setIsSendingRequest(true);
    setTimeout(async () => {
      setIsSendingRequest(false);
      setAccessState('approved');
      setApprovedTier(requestedTier);
      const recs = await mockApi.getRecords('All', patient.id);
      setRecords(recs);
      onShowToast(`Patient approved ${requestedTier} access for 2 hours!`);
    }, 1200);
  };

  const handleTriggerBreakGlassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassConfirm || !patient) return;
    setIsSubmittingBreakGlass(true);

    try {
      await mockApi.triggerEmergencyBreakGlass(
        'hosp-01',
        'City General Hospital',
        breakGlassCategory,
        breakGlassNotes,
        patient.id
      );
      setAccessState('break-glass');
      setApprovedTier('Tier 1');
      setShowBreakGlassModal(false);
      onShowToast('EMERGENCY BREAK-GLASS INVOKED! Logged on-chain with Tier 1 profile access.');
    } finally {
      setIsSubmittingBreakGlass(false);
    }
  };

  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setIsSigningWallet(true);

    try {
      const detailsMap: Record<string, string> = {};
      if (customParamKey.trim() && customParamVal.trim()) {
        detailsMap[customParamKey.trim()] = customParamVal.trim();
      }
      if (clinicalDiagnosis.trim()) {
        detailsMap['Clinical Diagnosis'] = clinicalDiagnosis.trim();
      }
      if (prescribedRx.trim()) {
        detailsMap['Prescription / Treatment'] = prescribedRx.trim();
      }
      if (Object.keys(detailsMap).length === 0) {
        detailsMap['Clinical Observation'] = 'Evaluated and documented during hospital encounter.';
      }

      const res = await mockApi.addHospitalRecord(patient.id, 'City General Hospital', {
        title: recTitle.trim() || 'Clinical Encounter Report',
        recordType: recType,
        doctorName: docName.trim() || 'Dr. A. R. Mehta',
        summary: recSummary.trim() || 'Clinical assessment completed.',
        details: detailsMap
      });

      setShowAddRecordModal(false);
      onShowToast(`Record anchored on-chain! Tx: ${res.txHash.slice(0, 10)}... (AES-256-GCM Encrypted)`);
      const updated = await mockApi.getRecords('All', patient.id);
      setRecords(updated);

      // Reset record form fields
      setRecTitle('HbA1c & Fasting Glucose Report');
      setRecSummary('Glycemic parameters show steady improvement.');
      setCustomParamKey('Blood Pressure');
      setCustomParamVal('120/80 mmHg');
      setClinicalDiagnosis('');
      setPrescribedRx('');
    } finally {
      setIsSigningWallet(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-emerald-100 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-3xl glass-panel shadow-card border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950 rounded-2xl text-emerald-300 border border-emerald-500/40">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {session?.facilityName || 'City General Hospital Portal'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Approved Provider
              </span>
            </div>
            <p className="text-xs text-emerald-200/70 font-mono mt-0.5 flex flex-wrap items-center gap-2">
              <span>{session?.staffName ? `${session.staffName} (${session.staffRole || 'Duty Physician'})` : 'Dr. A. R. Mehta'}</span>
              <span>•</span>
              <span>Wallet: {session?.walletAddress ? `${session.walletAddress.slice(0, 6)}...${session.walletAddress.slice(-4)}` : '0x71C7...976F'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-sans font-semibold">MST Testnet (91562037)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleConnectWallet}
            className={`px-4 py-2 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md transition-all ${
              walletConnected
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{walletConnected ? 'Wallet Linked' : 'Connect Wallet'}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Exit Hospital Session"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Switch Facility / Exit</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-Modal Patient Lookup & Triage Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Patient Triage & Vault Access Gateway</span>
            </h2>
            <p className="text-xs text-slate-500">
              Access patient records via hardware fingerprint scan, 14-digit MediID, or DNA salted hash.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setLookupMode('fingerprint')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                lookupMode === 'fingerprint'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Scan Fingerprint</span>
            </button>

            <button
              onClick={() => setLookupMode('mediId')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                lookupMode === 'mediId'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Enter MediID</span>
            </button>

            <button
              onClick={() => setLookupMode('dna')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                lookupMode === 'dna'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Dna className="w-3.5 h-3.5" />
              <span>DNA Sample Code</span>
            </button>
          </div>
        </div>

        {/* MODE 1: FINGERPRINT SCANNER */}
        {lookupMode === 'fingerprint' && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-teal-200 dark:border-teal-900/60 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Fingerprint className={`w-6 h-6 ${isScanningFingerprintTriage ? 'animate-pulse text-teal-500' : ''}`} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Biometric Fingerprint Scanner (Desk Reader / Touch ID)
                </h4>
                <p className="text-xs text-slate-500">
                  Scan patient fingerprint to instantly locate vault. If unregistered, you will be redirected to create a new vault.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <select
                value={triageFingerChoice}
                onChange={(e) => setTriageFingerChoice(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium"
              >
                <option value="hardware">Host Touch ID / Windows Hello</option>
                <option value="unregistered-test">⚠️ Unregistered Finger (Redirects to New Vault)</option>
                <option value="sim-right-thumb">Virtual Finger: Rajesh Kumar</option>
                <option value="sim-left-thumb">Virtual Finger: Ananya Sharma</option>
                <option value="sim-right-index">Virtual Finger: Vikram Malhotra</option>
              </select>

              <button
                onClick={() => handleScanPatientFingerprintLookup()}
                disabled={isScanningFingerprintTriage}
                className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {isScanningFingerprintTriage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning Fingerprint...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Scan Patient Finger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: MEDIID LOOKUP */}
        {lookupMode === 'mediId' && (
          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Enter 14-digit MediID (e.g. 91-2345-6789-0123)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleSearchPatient()}
              className="px-6 py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md"
            >
              Lookup MediID
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-teal-600" />
              <span>Scan QR</span>
            </button>
          </div>
        )}

        {/* MODE 3: DNA SAMPLE CODE */}
        {lookupMode === 'dna' && (
          <div className="flex flex-wrap items-center gap-3 animate-fade-in">
            <div className="relative flex-1 min-w-[280px]">
              <Dna className="w-4 h-4 text-purple-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Paste DNA Salted Hash (e.g. 0x8f7a1e3b...) or Lab Reference Code..."
                value={dnaInputCode}
                onChange={(e) => setDnaInputCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchByDna()}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-purple-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleSearchByDna}
              className="px-6 py-3 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Dna className="w-4 h-4" />
              <span>Fetch DNA Vault</span>
            </button>
          </div>
        )}

        {/* Action Buttons: Register New Patient & Break-Glass */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient Vault</span>
          </button>

          <button
            onClick={() => setShowBreakGlassModal(true)}
            className="px-5 py-2.5 rounded-2xl border-2 border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Emergency Break-Glass</span>
          </button>
        </div>
      </div>

      {/* Empty State Triage Guidance */}
      {!patient && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Triage Desk Ready — No Patient Currently Selected
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Search an existing patient's 14-digit MediID above, scan their dynamic QR card, or register an incoming walk-in patient to issue a new cryptographic MediID immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-transform transform hover:scale-105"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Patient & Issue MediID</span>
            </button>

            <span className="text-xs text-slate-400 font-medium px-2">or quick load demo patients:</span>

            <button
              onClick={() => handleSearchPatient('91-4827-6153-2043')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700"
            >
              Rajesh Kumar (Diabetic)
            </button>

            <button
              onClick={() => handleSearchPatient('91-5454-3297-1210')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700"
            >
              Ananya Sharma (Healthy)
            </button>

            <button
              onClick={() => handleSearchPatient('91-6828-7814-5965')}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700"
            >
              Vikram Malhotra (Hypertensive)
            </button>
          </div>
        </div>
      )}

      {/* Patient Result View */}
      {patient && (
        <div className="space-y-6 animate-fade-in">
          {/* Patient Overview Card */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-700 text-white font-black text-2xl flex items-center justify-center">
                {patient.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{patient.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    Blood Group: {patient.emergencyInfo.bloodGroup}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  MediID: {patient.mediId} • DOB: {patient.dob}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {accessState === 'none' && (
                <div className="flex items-center gap-2">
                  <select
                    value={requestedTier}
                    onChange={(e) => setRequestedTier(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700"
                  >
                    <option value="Tier 1">Request Tier 1 (Emergency Only)</option>
                    <option value="Tier 2">Request Tier 2 (Full History)</option>
                  </select>

                  <button
                    onClick={handleSendRequest}
                    disabled={isSendingRequest}
                    className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md"
                  >
                    {isSendingRequest ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Access Request</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {accessState === 'approved' && (
                <span className="px-4 py-2 rounded-xl bg-emerald-950 text-emerald-300 font-bold text-xs border border-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved ({approvedTier} Access Active)</span>
                </span>
              )}

              {accessState === 'break-glass' && (
                <span className="px-4 py-2 rounded-xl bg-rose-950 text-rose-200 font-bold text-xs border border-rose-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Break-Glass Active (Tier 1 Only)</span>
                </span>
              )}
            </div>
          </div>

          {/* Persistent Red Banner if Break-Glass Active */}
          {accessState === 'break-glass' && (
            <div className="p-4 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-glow-red flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                <span>EMERGENCY ACCESS ACTIVE — PERMANENTLY LOGGED ON MST TESTNET (Tx: 0xe5f6...5682)</span>
              </div>
              <ChainBadge txHash="0xe5f6a1b2c3d47890123456789abcdef012345682" label="Audit Hash" />
            </div>
          )}

          {/* Emergency Card Display (Always Available for Triage) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-600" />
              <span>Tier 1 Emergency Profile (Allergies, Conditions, Contacts)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-2">
                <span className="font-bold text-rose-800 dark:text-rose-300 block">Severe Allergies</span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.emergencyInfo.allergies.map((a, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 font-bold text-rose-900 dark:text-rose-100">
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Active Conditions</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {patient.emergencyInfo.conditions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Current Medications</span>
                <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                  {patient.emergencyInfo.medications.map((m, i) => (
                    <li key={i}><strong>{m.name}</strong> ({m.dosage})</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tier 2 Clinical History Timeline & Add Record Panel */}
          {approvedTier === 'Tier 2' && accessState === 'approved' && (
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    Tier 2 Full Clinical History
                  </h3>
                  <p className="text-xs text-slate-500">Decrypting verified patient records timeline...</p>
                </div>

                <button
                  onClick={() => setShowAddRecordModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Hospital-Verified Record</span>
                </button>
              </div>

              <div className="space-y-3">
                {records.map((rec) => (
                  <TimelineItem key={rec.id} record={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Optical Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        scannerRole="hospital"
        title="Hospital Triage: Optical MediID Scanner"
        onPatientLoaded={(scannedPatient, scannedRecords) => {
          setPatient(scannedPatient);
          setSearchQuery(scannedPatient.mediId);
          setRecords(scannedRecords);
          setAccessState('none');
          setShowQrModal(false);
          onShowToast(`✓ Camera verified: ${scannedPatient.name} (MediID: ${scannedPatient.mediId})`);
        }}
      />

      {/* Emergency Break Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border-2 border-rose-500 space-y-5">
            <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold text-base">
                <ShieldAlert className="w-6 h-6" />
                <span>UNSANCTIONED EMERGENCY BREAK-GLASS</span>
              </div>
              <button onClick={() => setShowBreakGlassModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Break-glass overrides patient approval for life-threatening emergencies. Tier 1 profile will be unlocked instantly, and an immutable audit alert will be flagged on-chain.
            </p>

            <form onSubmit={handleTriggerBreakGlassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason Category
                </label>
                <select
                  value={breakGlassCategory}
                  onChange={(e) => setBreakGlassCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Acute Respiratory Distress">Acute Respiratory Distress</option>
                  <option value="Unconscious / Trauma Bay Admission">Unconscious / Trauma Bay Admission</option>
                  <option value="Severe Anaphylactic Shock">Severe Anaphylactic Shock</option>
                  <option value="Cardiac Arrest Triage">Cardiac Arrest Triage</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Notes & Doctor Justification
                </label>
                <textarea
                  rows={2}
                  value={breakGlassNotes}
                  onChange={(e) => setBreakGlassNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900">
                <label className="flex items-start gap-2 cursor-pointer text-rose-900 dark:text-rose-200 font-bold">
                  <input
                    type="checkbox"
                    checked={breakGlassConfirm}
                    onChange={(e) => setBreakGlassConfirm(e.target.checked)}
                    required
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I understand this emergency break-glass action is permanently logged on-chain and the patient will be notified immediately.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!breakGlassConfirm || isSubmittingBreakGlass}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 shadow-md"
                >
                  {isSubmittingBreakGlass ? 'Invoking Break-Glass...' : 'Confirm Break-Glass Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Anchor Hospital-Signed Medical Record
              </h3>
              <button onClick={() => setShowAddRecordModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRecordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Report Title</label>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Lab Report">Lab Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Diagnostic Imaging">Diagnostic Imaging</option>
                    <option value="Discharge Summary">Discharge Summary</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    list="hospital-doctor-directory"
                    placeholder="Search or enter a doctor's name"
                    autoComplete="off"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <datalist id="hospital-doctor-directory">
                    {CANONICAL_DOCTORS.map((doctor) => (
                      <option key={doctor.id} value={doctor.name} label={`${doctor.specialty} · ${doctor.hospital}`} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Diagnosis / Clinical Finding</label>
                  <input
                    type="text"
                    value={clinicalDiagnosis}
                    onChange={(e) => setClinicalDiagnosis(e.target.value)}
                    placeholder="e.g. Type 2 Diabetes Mellitus"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescription / Medication</label>
                  <input
                    type="text"
                    value={prescribedRx}
                    onChange={(e) => setPrescribedRx(e.target.value)}
                    placeholder="e.g. Metformin 500mg BD"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Diagnostic Parameter</label>
                  <input
                    type="text"
                    value={customParamKey}
                    onChange={(e) => setCustomParamKey(e.target.value)}
                    placeholder="e.g. Blood Pressure or HbA1c"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reading / Result</label>
                  <input
                    type="text"
                    value={customParamVal}
                    onChange={(e) => setCustomParamVal(e.target.value)}
                    placeholder="e.g. 120/80 mmHg or 6.8%"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Summary Notes</label>
                <textarea
                  rows={2}
                  value={recSummary}
                  onChange={(e) => setRecSummary(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                  Cryptographic Wallet Signature Step
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Record payload will be encrypted with AES-256-GCM and signed with City General Hospital wallet (0x71C7...976F).
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigningWallet}
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSigningWallet ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing with Wallet & Anchoring...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sign & Anchor On-Chain</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register New Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Hospital Triage: Register New Patient
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    City General Triage Desk • MST Testnet Identity Anchor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHospitalRegisterPatient} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-3">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                  Generates a 14-digit Luhn-verified MediID and isolated Vault ID. Baseline emergency demographics are stored off-chain with AES-256-GCM encryption and anchored to MST Testnet.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Devendra Prasad"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={regBloodGroup}
                    onChange={(e) => setRegBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile / Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98450 11223"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="patient@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Allergies & Critical Contraindications
                </label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, NSAIDs, Peanuts (comma-separated)"
                  value={regAllergies}
                  onChange={(e) => setRegAllergies(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Active Conditions / Admission Complaint
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acute Lower Abdominal Pain, Type 2 Diabetes"
                  value={regConditions}
                  onChange={(e) => setRegConditions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meera Prasad (Spouse)"
                    value={regEmergencyContact}
                    onChange={(e) => setRegEmergencyContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98450 11224"
                    value={regEmergencyPhone}
                    onChange={(e) => setRegEmergencyPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lab DNA Barcode / Clinical Reference ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="DNA-LAB-XXXXXX"
                  value={regDnaRef}
                  onChange={(e) => setRegDnaRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Patient Biometric Enrolment Box */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Patient Device Biometric Enrolment
                    </span>
                  </div>
                  {regBiometricEnrolled ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled (Touch ID / Enclave)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Pending Scan</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Enrol patient's fingerprint passkey to bind their private vault key to their hardware biometric authenticator.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="inline-flex p-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setRegBioMode('virtual')}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        regBioMode === 'virtual'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Virtual Scanner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegBioMode('hardware')}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        regBioMode === 'hardware'
                          ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Host Touch ID
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleScanHospitalPatientBiometrics()}
                    disabled={regBiometricScanning}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {regBiometricScanning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Prompting Scanner...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>
                          {regBiometricEnrolled
                            ? 'Re-scan Fingerprint'
                            : regBioMode === 'hardware'
                            ? 'Scan Host Touch ID'
                            : 'Scan Patient Finger'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Luhn MediID & Anchoring...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Register Patient & Issue MediID</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
