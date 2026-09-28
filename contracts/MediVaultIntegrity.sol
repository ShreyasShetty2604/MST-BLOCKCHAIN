// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MediVaultIntegrity
 * @notice Sovereign Medical Identity & Integrity Verification Layer
 *
 * CRITICAL ARCHITECTURAL SECURITY PRINCIPLES:
 * 1. NEVER store raw fingerprint data, raw DNA sequences, encrypted medical records,
 *    or cryptographic encryption keys on-chain.
 * 2. The blockchain serves strictly as the tamper-evident TRUST & INTEGRITY LAYER.
 * 3. All sensitive medical and biometric data remains off-chain in AES-256-GCM encrypted storage.
 * 4. This contract only anchors immutable 32-byte cryptographic hashes and emits audit events.
 */
contract MediVaultIntegrity {
    struct VaultIntegrityRecord {
        bytes32 identityHash;     // Salted HMAC-SHA256 of 14-digit MediID
        bytes32 fingerprintHash;  // SHA-256 of encrypted biometric template
        bytes32 dnaHash;          // SHA-256 of accredited laboratory DNA reference
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // Mapping from opaque internal Vault ID (e.g. "VLT-8F29A31B72C1") to integrity record
    mapping(string => VaultIntegrityRecord) private vaults;

    // Registry to ensure global uniqueness of sovereign MediID hashes
    mapping(bytes32 => bool) private registeredIdentityHashes;

    // Access control: Contract deployer / authorized relayer
    address public owner;
    mapping(address => bool) public authorizedRelayers;

    // Audit Events
    event VaultCreated(string indexed vaultId, bytes32 indexed identityHash, uint256 timestamp);
    event IdentityHashRegistered(string indexed vaultId, bytes32 indexed identityHash, uint256 timestamp);
    event FingerprintHashRegistered(string indexed vaultId, bytes32 indexed fingerprintHash, uint256 timestamp);
    event DNAHashRegistered(string indexed vaultId, bytes32 indexed dnaHash, uint256 timestamp);
    event IntegrityVerified(string indexed vaultId, string recordType, bytes32 submittedHash, bool isValid, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "MediVault: Caller is not contract owner");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedRelayers[msg.sender], "MediVault: Caller is not authorized relayer");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedRelayers[msg.sender] = true;
    }

    function setRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
    }

    /**
     * @notice Registers a new patient vault with an immutable identity hash.
     * @param vaultId Internal opaque vault reference (e.g. "VLT-8F29A31B72C1")
     * @param identityHash Salted HMAC-SHA256 hash of the 14-digit MediID
     */
    function createVault(string calldata vaultId, bytes32 identityHash) external onlyAuthorized {
        require(bytes(vaultId).length > 0, "MediVault: Invalid vaultId");
        require(identityHash != bytes32(0), "MediVault: Invalid identityHash");
        require(!vaults[vaultId].exists, "MediVault: Vault already exists");
        require(!registeredIdentityHashes[identityHash], "MediVault: Identity hash already registered (duplicate MediID)");

        vaults[vaultId] = VaultIntegrityRecord({
            identityHash: identityHash,
            fingerprintHash: bytes32(0),
            dnaHash: bytes32(0),
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        registeredIdentityHashes[identityHash] = true;
        emit VaultCreated(vaultId, identityHash, block.timestamp);
    }

    /**
     * @notice Anchors the cryptographic hash of an off-chain encrypted biometric template.
     */
    function registerFingerprintHash(string calldata vaultId, bytes32 fingerprintHash) external onlyAuthorized {
        require(vaults[vaultId].exists, "MediVault: Vault does not exist");
        require(fingerprintHash != bytes32(0), "MediVault: Invalid fingerprint hash");

        vaults[vaultId].fingerprintHash = fingerprintHash;
        vaults[vaultId].updatedAt = block.timestamp;

        emit FingerprintHashRegistered(vaultId, fingerprintHash, block.timestamp);
    }

    /**
     * @notice Anchors the cryptographic hash of an off-chain encrypted laboratory DNA reference.
     */
    function registerDNAHash(string calldata vaultId, bytes32 dnaHash) external onlyAuthorized {
        require(vaults[vaultId].exists, "MediVault: Vault does not exist");
        require(dnaHash != bytes32(0), "MediVault: Invalid DNA hash");

        vaults[vaultId].dnaHash = dnaHash;
        vaults[vaultId].updatedAt = block.timestamp;

        emit DNAHashRegistered(vaultId, dnaHash, block.timestamp);
    }

    /**
     * @notice Verifies whether a candidate biometric hash matches the on-chain anchored proof.
     */
    function verifyFingerprintHash(string calldata vaultId, bytes32 candidateHash) external returns (bool) {
        require(vaults[vaultId].exists, "MediVault: Vault does not exist");
        bool isValid = (vaults[vaultId].fingerprintHash == candidateHash && candidateHash != bytes32(0));
        emit IntegrityVerified(vaultId, "FINGERPRINT", candidateHash, isValid, block.timestamp);
        return isValid;
    }

    /**
     * @notice Verifies whether a candidate DNA reference hash matches the on-chain anchored proof.
     */
    function verifyDNAHash(string calldata vaultId, bytes32 candidateHash) external returns (bool) {
        require(vaults[vaultId].exists, "MediVault: Vault does not exist");
        bool isValid = (vaults[vaultId].dnaHash == candidateHash && candidateHash != bytes32(0));
        emit IntegrityVerified(vaultId, "DNA", candidateHash, isValid, block.timestamp);
        return isValid;
    }

    /**
     * @notice Verifies whether a candidate MediID hash matches the on-chain anchored proof.
     */
    function verifyIdentityHash(string calldata vaultId, bytes32 candidateHash) external returns (bool) {
        require(vaults[vaultId].exists, "MediVault: Vault does not exist");
        bool isValid = (vaults[vaultId].identityHash == candidateHash && candidateHash != bytes32(0));
        emit IntegrityVerified(vaultId, "IDENTITY", candidateHash, isValid, block.timestamp);
        return isValid;
    }

    /**
     * @notice Reads full cryptographic integrity status for a vault.
     */
    function getVaultIntegrity(string calldata vaultId) external view returns (
        bytes32 identityHash,
        bytes32 fingerprintHash,
        bytes32 dnaHash,
        uint256 createdAt,
        uint256 updatedAt,
        bool exists
    ) {
        VaultIntegrityRecord memory record = vaults[vaultId];
        return (
            record.identityHash,
            record.fingerprintHash,
            record.dnaHash,
            record.createdAt,
            record.updatedAt,
            record.exists
        );
    }
}
