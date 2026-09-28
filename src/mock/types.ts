export type Role = 'patient' | 'hospital' | 'admin';

export type RecordCategory = 'Prescriptions' | 'Reports' | 'Self-declared' | 'Hospital-verified' | 'Vaccinations';

export interface EmergencyInfo {
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  medications: { name: string; dosage: string; frequency: string }[];
  emergencyContact: { name: string; relation: string; phone: string };
}

export interface PatientPersona {
  id: string;
  name: string;
  mediId: string; // Formatted 91-2345-6789-0123
  dob: string;
  gender: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  dnaSaltedHash?: string;
  vaultId?: string;
  emergencyInfo: EmergencyInfo;
  verifiedRecordCount: number;
  activeConsentCount: number;
  lastAccessTime: string;
}

export interface IdentitySecurityState {
  vaultId: string;
  mediId: string;
  mediIdHash: string;
  isMediIdValid: boolean;
  fingerprintProtected: boolean;
  fingerprintHash: string;
  dnaProtected: boolean;
  dnaReferenceId: string;
  dnaHash: string;
  encryptionActive: 'AES-256-GCM';
  blockchainIntegrity: 'VERIFIED' | 'TAMPERED' | 'CHECKING';
}

export interface RecordVersionDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  category: RecordCategory;
  recordType: string;
  source: string;
  sourceType: 'hospital' | 'self';
  date: string;
  doctor?: string;
  txHash: string;
  blockNumber: number;
  version: number;
  previousVersionHash?: string;
  diffSummary?: RecordVersionDiff[];
  status: 'verified' | 'self-declared' | 'pending' | 'tampered';
  payload: {
    summary: string;
    details: Record<string, string>;
    attachments?: { name: string; size: string; type: string }[];
    signedBy?: string;
    signatureHash?: string;
  };
  hash: string;
  tamperedHash?: string;
}

export interface Consent {
  id: string;
  hospitalId: string;
  hospitalName: string;
  tier: 'Tier 1' | 'Tier 2';
  tierLabel: string;
  grantedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
  txHash: string;
  reason: string;
}

export interface AuditLog {
  id: string;
  eventType: 'Access' | 'Emergency Access' | 'AI Read' | 'Consent Granted' | 'Consent Revoked' | 'Record Added' | 'Integrity Check';
  actor: string;
  action: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
  isEmergency: boolean;
  isFlagged?: boolean;
  flagReason?: string;
}

export interface Hospital {
  id: string;
  name: string;
  walletAddress: string;
  status: 'Approved' | 'Pending' | 'Suspended';
  trustScore: number;
  emergencyAccessCount: number;
  registeredAt: string;
}

export interface CheckupReminder {
  id: string;
  title: string;
  dueState: 'due' | 'overdue' | 'done'; // amber, red, green
  dueStateLabel: string;
  dueDate: string;
  daysRemaining: number;
  lastDoneDate: string;
  hospitalVerified: boolean;
  hospitalName?: string;
  txHash?: string;
}

export interface IntegrityResult {
  recordId: string;
  title: string;
  status: 'verified' | 'tampered';
  expectedHash: string;
  computedHash: string;
  timestamp: string;
}

export interface IncomingAccessRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  reason: string;
  requestedTier: 'Tier 1' | 'Tier 2';
  requestedAt: string;
}

export interface SystemStats {
  totalVaults: number;
  recordsAnchored: number;
  consentsGranted: number;
  emergenciesUsed: number;
  networkStatus: string;
  dailyAuditsTrend: { day: string; accesses: number; emergencies: number }[];
}
