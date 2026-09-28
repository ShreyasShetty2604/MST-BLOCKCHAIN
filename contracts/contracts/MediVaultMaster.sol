// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MediVaultMaster
 * @notice Complete Phase 2 Smart Contract suite for MediVault.
 * Includes Vault Registry, Hospital Trust Scores, Record Versioning,
 * Time-Bound Consents, Emergency Abuse Controls, and Immutable Audit Logging.
 */
contract MediVaultMaster is Ownable {
    enum Tier { None, Tier1_EmergencyOnly, Tier2_FullHistory }

    struct Vault {
        bytes32 vaultId; // Random vault ID (not derived from person/health ID)
        bytes32 healthIdHash; // SHA-256 hash of MediID
        address owner;
        uint256 createdAt;
        bool exists;
    }

    struct HospitalInfo {
        address hospitalAddress;
        string name;
        uint256 trustScore; // Base 1000 = 100.0%
        uint256 emergencyCount;
        uint256 lastEmergencyTimestamp;
        bool isApproved;
    }

    struct RecordItem {
        bytes32 recordId;
        bytes32 vaultId;
        bytes32 payloadHash;
        string recordType;
        string source;
        bytes32 previousRecordId;
        uint256 version;
        uint256 timestamp;
        address author;
    }

    struct ConsentInfo {
        Tier tier;
        uint256 expiry;
        bool isRevoked;
    }

    struct AuditEntry {
        bytes32 logId;
        bytes32 vaultId;
        address actor;
        string eventType;
        string detail;
        uint256 timestamp;
        bool isEmergency;
        bool isFlagged;
        string flagReason;
    }

    // Storage
    mapping(bytes32 => Vault) public vaults;
    mapping(bytes32 => bool) public usedHealthIdHashes;
    mapping(address => bytes32) public ownerToVaultId;

    mapping(address => HospitalInfo) public hospitals;
    address[] public hospitalList;

    mapping(bytes32 => mapping(bytes32 => RecordItem)) public records; // vaultId => recordId => RecordItem
    mapping(bytes32 => bytes32[]) public vaultRecordIds; // vaultId => recordId list

    mapping(bytes32 => mapping(address => ConsentInfo)) public consents; // vaultId => hospital => ConsentInfo

    AuditEntry[] public auditLogs;
    mapping(bytes32 => uint256[]) public vaultAuditLogIndices;

    // Rate limit constant: Max 3 emergency accesses per hour per hospital
    uint256 public constant EMERGENCY_RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_EMERGENCY_PER_WINDOW = 3;

    // Events
    event VaultCreated(bytes32 indexed vaultId, bytes32 indexed healthIdHash, address indexed owner);
    event HospitalAdded(address indexed hospital, string name);
    event HospitalRemoved(address indexed hospital);
    event RecordAdded(bytes32 indexed vaultId, bytes32 indexed recordId, bytes32 hash, string recordType, uint256 version);
    event ConsentGranted(bytes32 indexed vaultId, address indexed hospital, uint8 tier, uint256 expiry);
    event ConsentRevoked(bytes32 indexed vaultId, address indexed hospital);
    event AccessLogged(bytes32 indexed vaultId, address indexed actor, bytes32 recordId);
    event EmergencyAccessed(bytes32 indexed vaultId, address indexed hospital, string category, string notes);
    event MisuseFlagged(bytes32 indexed vaultId, bytes32 indexed logId, address indexed patient, string reason);
    event AIAccessed(bytes32 indexed vaultId, address indexed actor);
    event CheckupCompleted(bytes32 indexed vaultId, string checkupType);

    constructor() Ownable(msg.sender) {}

    // 1. Vault Registry
    function createVault(bytes32 _vaultId, bytes32 _healthIdHash) external returns (bytes32) {
        require(_vaultId != bytes32(0), "Invalid vault ID");
        require(!vaults[_vaultId].exists, "Vault ID already exists");
        require(!usedHealthIdHashes[_healthIdHash], "Health ID hash already registered");

        vaults[_vaultId] = Vault({
            vaultId: _vaultId,
            healthIdHash: _healthIdHash,
            owner: msg.sender,
            createdAt: block.timestamp,
            exists: true
        });

        usedHealthIdHashes[_healthIdHash] = true;
        ownerToVaultId[msg.sender] = _vaultId;

        emit VaultCreated(_vaultId, _healthIdHash, msg.sender);
        return _vaultId;
    }

    // 2. Hospital Registry (Admin only)
    function addHospital(address _hospital, string memory _name) external onlyOwner {
        require(_hospital != address(0), "Invalid hospital address");
        require(!hospitals[_hospital].isApproved, "Hospital already approved");

        hospitals[_hospital] = HospitalInfo({
            hospitalAddress: _hospital,
            name: _name,
            trustScore: 1000, // 100.0%
            emergencyCount: 0,
            lastEmergencyTimestamp: 0,
            isApproved: true
        });

        hospitalList.push(_hospital);
        emit HospitalAdded(_hospital, _name);
    }

    function removeHospital(address _hospital) external onlyOwner {
        require(hospitals[_hospital].isApproved, "Hospital not found or already removed");
        hospitals[_hospital].isApproved = false;
        emit HospitalRemoved(_hospital);
    }

    // 3. Records Management with Versioning
    function addRecord(
        bytes32 _vaultId,
        bytes32 _payloadHash,
        string memory _recordType,
        string memory _source,
        bytes32 _previousRecordId
    ) external returns (bytes32 recordId) {
        require(vaults[_vaultId].exists, "Vault does not exist");
        
        recordId = keccak256(abi.encodePacked(_vaultId, _payloadHash, block.timestamp, vaultRecordIds[_vaultId].length));

        uint256 version = 1;
        if (_previousRecordId != bytes32(0) && records[_vaultId][_previousRecordId].version > 0) {
            version = records[_vaultId][_previousRecordId].version + 1;
        }

        records[_vaultId][recordId] = RecordItem({
            recordId: recordId,
            vaultId: _vaultId,
            payloadHash: _payloadHash,
            recordType: _recordType,
            source: _source,
            previousRecordId: _previousRecordId,
            version: version,
            timestamp: block.timestamp,
            author: msg.sender
        });

        vaultRecordIds[_vaultId].push(recordId);

        _logAudit(_vaultId, msg.sender, "Record Added", string(abi.encodePacked("Anchored ", _recordType, " v", _uint2str(version))), false);
        emit RecordAdded(_vaultId, recordId, _payloadHash, _recordType, version);
        return recordId;
    }

    // 4. Consent Management
    function grantAccess(bytes32 _vaultId, address _hospital, uint8 _tier, uint256 _expiry) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        require(vaults[_vaultId].owner == msg.sender, "Only vault owner can grant consent");
        require(_tier == 1 || _tier == 2, "Invalid tier");
        require(_expiry > block.timestamp, "Expiry must be in the future");

        consents[_vaultId][_hospital] = ConsentInfo({
            tier: Tier(_tier),
            expiry: _expiry,
            isRevoked: false
        });

        _logAudit(_vaultId, msg.sender, "Consent Granted", "Granted time-bound permission", false);
        emit ConsentGranted(_vaultId, _hospital, _tier, _expiry);
    }

    function revokeAccess(bytes32 _vaultId, address _hospital) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        require(vaults[_vaultId].owner == msg.sender, "Only vault owner can revoke consent");

        consents[_vaultId][_hospital].isRevoked = true;

        _logAudit(_vaultId, msg.sender, "Consent Revoked", "Revoked permission ahead of expiry", false);
        emit ConsentRevoked(_vaultId, _hospital);
    }

    function hasAccess(bytes32 _vaultId, address _hospital, uint8 _requiredTier) public view returns (bool) {
        if (!vaults[_vaultId].exists) return false;
        ConsentInfo memory c = consents[_vaultId][_hospital];
        if (c.isRevoked || c.expiry <= block.timestamp) return false;
        return uint8(c.tier) >= _requiredTier;
    }

    // 5. Access and Audit Logging
    function accessRecord(bytes32 _vaultId, bytes32 _recordId) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        require(
            msg.sender == vaults[_vaultId].owner || hasAccess(_vaultId, msg.sender, 2),
            "Unauthorized access"
        );

        _logAudit(_vaultId, msg.sender, "Record Access", "Accessed clinical history record", false);
        emit AccessLogged(_vaultId, msg.sender, _recordId);
    }

    // Emergency Access (Tier 1 only, Rate Limited)
    function emergencyAccess(
        bytes32 _vaultId,
        string memory _category,
        string memory _notes
    ) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        require(hospitals[msg.sender].isApproved, "Only approved hospitals can trigger break-glass");

        HospitalInfo storage hosp = hospitals[msg.sender];
        if (block.timestamp - hosp.lastEmergencyTimestamp < EMERGENCY_RATE_LIMIT_WINDOW) {
            require(hosp.emergencyCount < MAX_EMERGENCY_PER_WINDOW, "Emergency rate limit exceeded for hospital");
            hosp.emergencyCount += 1;
        } else {
            hosp.emergencyCount = 1;
            hosp.lastEmergencyTimestamp = block.timestamp;
        }

        _logAudit(_vaultId, msg.sender, "Emergency Access", string(abi.encodePacked(_category, ": ", _notes)), true);
        emit EmergencyAccessed(_vaultId, msg.sender, _category, _notes);
    }

    // Misuse Flagging with Trust Score Penalty
    function flagMisuse(bytes32 _vaultId, bytes32 _logId, string memory _reason) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        require(vaults[_vaultId].owner == msg.sender, "Only vault owner can flag misuse");

        for (uint256 i = 0; i < auditLogs.length; i++) {
            if (auditLogs[i].logId == _logId && auditLogs[i].vaultId == _vaultId) {
                auditLogs[i].isFlagged = true;
                auditLogs[i].flagReason = _reason;

                // Penalize hospital trust score by -50 points (-5.0%)
                address actor = auditLogs[i].actor;
                if (hospitals[actor].isApproved && hospitals[actor].trustScore >= 50) {
                    hospitals[actor].trustScore -= 50;
                }

                emit MisuseFlagged(_vaultId, _logId, msg.sender, _reason);
                break;
            }
        }
    }

    // 6. Extras: AI Access & Checkup Logging
    function logAIAccess(bytes32 _vaultId) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        _logAudit(_vaultId, msg.sender, "AI Read", "Read profile parameters once for guidance session", false);
        emit AIAccessed(_vaultId, msg.sender);
    }

    function logCheckup(bytes32 _vaultId, string memory _checkupType) external {
        require(vaults[_vaultId].exists, "Vault does not exist");
        _logAudit(_vaultId, msg.sender, "Checkup Completed", _checkupType, false);
        emit CheckupCompleted(_vaultId, _checkupType);
    }

    // Internal Helpers
    function _logAudit(
        bytes32 _vaultId,
        address _actor,
        string memory _eventType,
        string memory _detail,
        bool _isEmergency
    ) internal returns (bytes32 logId) {
        logId = keccak256(abi.encodePacked(_vaultId, _actor, block.timestamp, auditLogs.length));

        auditLogs.push(AuditEntry({
            logId: logId,
            vaultId: _vaultId,
            actor: _actor,
            eventType: _eventType,
            detail: _detail,
            timestamp: block.timestamp,
            isEmergency: _isEmergency,
            isFlagged: false,
            flagReason: ""
        }));

        uint256 index = auditLogs.length - 1;
        vaultAuditLogIndices[_vaultId].push(index);
    }

    function _uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (uint8)(48 + uint256(_i % 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
