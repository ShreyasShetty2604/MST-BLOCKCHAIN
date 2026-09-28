// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MediVaultCore
 * @notice Core registry mapping sovereign MediIDs to patient vault addresses & anchoring record payload hashes.
 */
contract MediVaultCore is Ownable {
    struct PatientProfile {
        string mediId;
        string name;
        bytes32 dnaSaltedHash;
        uint256 registeredAt;
        bool exists;
    }

    struct RecordAnchor {
        bytes32 recordId;
        bytes32 payloadHash;
        string recordCategory;
        address source;
        uint256 blockTimestamp;
        uint256 version;
    }

    // Mappings
    mapping(address => PatientProfile) public patientProfiles;
    mapping(bytes32 => address) public mediIdToPatient;
    mapping(address => RecordAnchor[]) public patientRecords;

    // Events
    event PatientRegistered(address indexed patient, string mediId, string name);
    event RecordAnchored(address indexed patient, bytes32 indexed recordId, bytes32 payloadHash, string category);

    constructor() Ownable(msg.sender) {}

    function registerPatient(
        string memory _mediId,
        string memory _name,
        bytes32 _dnaSaltedHash
    ) external {
        require(!patientProfiles[msg.sender].exists, "Patient already registered");
        
        bytes32 mediIdBytes = keccak256(abi.encodePacked(_mediId));
        require(mediIdToPatient[mediIdBytes] == address(0), "MediID already taken");

        patientProfiles[msg.sender] = PatientProfile({
            mediId: _mediId,
            name: _name,
            dnaSaltedHash: _dnaSaltedHash,
            registeredAt: block.timestamp,
            exists: true
        });

        mediIdToPatient[mediIdBytes] = msg.sender;
        emit PatientRegistered(msg.sender, _mediId, _name);
    }

    function anchorRecord(
        address _patient,
        bytes32 _recordId,
        bytes32 _payloadHash,
        string memory _category,
        uint256 _version
    ) external {
        require(patientProfiles[_patient].exists, "Patient profile does not exist");

        patientRecords[_patient].push(RecordAnchor({
            recordId: _recordId,
            payloadHash: _payloadHash,
            recordCategory: _category,
            source: msg.sender,
            blockTimestamp: block.timestamp,
            version: _version
        }));

        emit RecordAnchored(_patient, _recordId, _payloadHash, _category);
    }

    function verifyRecordIntegrity(
        address _patient,
        bytes32 _recordId,
        bytes32 _computedHash
    ) external view returns (bool isValid) {
        RecordAnchor[] memory records = patientRecords[_patient];
        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].recordId == _recordId) {
                return records[i].payloadHash == _computedHash;
            }
        }
        return false;
    }
}
