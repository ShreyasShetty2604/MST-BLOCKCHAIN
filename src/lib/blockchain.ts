/**
 * MediVault Blockchain Integrity Service Layer
 *
 * Implements off-chain to on-chain hash anchoring and verification.
 * Follows the Golden Rule:
 * "Never store raw fingerprint, raw DNA, encrypted DNA, or keys on-chain.
 *  The chain is strictly the trust and integrity layer."
 */

export interface OnChainRecord {
  vaultId: string;
  identityHash: string;
  fingerprintHash: string;
  dnaHash: string;
  blockNumber: number;
  txHash: string;
  network: string;
  updatedAt: string;
}

export interface VerificationEvent {
  vaultId: string;
  component: 'IDENTITY' | 'FINGERPRINT' | 'DNA';
  submittedHash: string;
  anchoredHash: string;
  isValid: boolean;
  blockNumber: number;
  txHash: string;
  timestamp: string;
}

// In-memory on-chain ledger simulation mirroring MediVaultIntegrity.sol
const onChainLedger: Map<string, OnChainRecord> = new Map([
  [
    'VLT-8F29A31B72C1',
    {
      vaultId: 'VLT-8F29A31B72C1',
      identityHash: '0xe06e11fa4e299e8000b50709021f578c97c9f61dbd0f558620b391c33622b1f9',
      fingerprintHash: '0x9924e930f370ba054a37f5519ea818987ec347adcdcf783c675c97ea8a46b6eb',
      dnaHash: '0x8f7a1e3b5c9d2f4a6e8b0c2d4f6a8e0b2c4d6e8fa1b2c3d4e5f6a7b8c9d0e1f2',
      blockNumber: 4820120,
      txHash: '0x7f9a12b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5',
      network: 'Polygon Amoy Testnet (Chain ID: 80002)',
      updatedAt: '2026-09-28T16:00:00Z'
    }
  ]
]);

function generateTxHash(): string {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += hex[Math.floor(Math.random() * 16)];
  }
  return hash;
}

export const blockchainService = {
  /**
   * Anchors a new vault identity hash on-chain.
   */
  createVaultOnChain: async (vaultId: string, identityHash: string): Promise<OnChainRecord> => {
    const txHash = generateTxHash();
    const record: OnChainRecord = {
      vaultId,
      identityHash,
      fingerprintHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      dnaHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      blockNumber: 4820000 + Math.floor(Math.random() * 500),
      txHash,
      network: 'Polygon Amoy Testnet (Chain ID: 80002)',
      updatedAt: new Date().toISOString()
    };
    onChainLedger.set(vaultId, record);
    return record;
  },

  /**
   * Anchors biometric template hash on-chain.
   */
  registerFingerprintHashOnChain: async (vaultId: string, fingerprintHash: string): Promise<string> => {
    let rec = onChainLedger.get(vaultId);
    if (!rec) {
      rec = await blockchainService.createVaultOnChain(vaultId, '0x0000000000000000000000000000000000000000000000000000000000000000');
    }
    rec.fingerprintHash = fingerprintHash;
    rec.txHash = generateTxHash();
    rec.updatedAt = new Date().toISOString();
    return rec.txHash;
  },

  /**
   * Anchors laboratory DNA reference hash on-chain.
   */
  registerDNAHashOnChain: async (vaultId: string, dnaHash: string): Promise<string> => {
    let rec = onChainLedger.get(vaultId);
    if (!rec) {
      rec = await blockchainService.createVaultOnChain(vaultId, '0x0000000000000000000000000000000000000000000000000000000000000000');
    }
    rec.dnaHash = dnaHash;
    rec.txHash = generateTxHash();
    rec.updatedAt = new Date().toISOString();
    return rec.txHash;
  },

  /**
   * Verifies candidate record hash against on-chain anchored hash.
   */
  verifyOnChain: async (
    vaultId: string,
    component: 'IDENTITY' | 'FINGERPRINT' | 'DNA',
    candidateHash: string
  ): Promise<VerificationEvent> => {
    const rec = onChainLedger.get(vaultId);
    const txHash = generateTxHash();
    const blockNumber = 4820500 + Math.floor(Math.random() * 100);

    let anchored = '';
    if (component === 'IDENTITY') anchored = rec?.identityHash || '';
    if (component === 'FINGERPRINT') anchored = rec?.fingerprintHash || '';
    if (component === 'DNA') anchored = rec?.dnaHash || '';

    const isValid = Boolean(anchored && candidateHash && anchored.toLowerCase() === candidateHash.toLowerCase());

    return {
      vaultId,
      component,
      submittedHash: candidateHash,
      anchoredHash: anchored,
      isValid,
      blockNumber,
      txHash,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Fetches on-chain integrity status for a vault.
   */
  getOnChainRecord: async (vaultId: string): Promise<OnChainRecord | null> => {
    return onChainLedger.get(vaultId) || null;
  }
};
