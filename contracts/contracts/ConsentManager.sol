// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConsentManager
 * @notice Manages time-bound Tier 1 / Tier 2 consents & unsanctioned emergency break-glass logs.
 */
contract ConsentManager is Ownable {
    enum Tier { Tier1_EmergencyOnly, Tier2_FullHistory }

    struct Consent {
        bytes32 consentId;
        address hospital;
        Tier tier;
        uint256 grantedAt;
        uint256 expiresAt;
        bool isRevoked;
        string reason;
    }

    struct EmergencyAccessLog {
        address hospital;
        uint256 timestamp;
        string category;
        string notes;
        bool isFlagged;
    }

    // Mappings
    mapping(address => Consent[]) public patientConsents;
    mapping(address => EmergencyAccessLog[]) public patientEmergencies;

    // Events
    event ConsentGranted(address indexed patient, address indexed hospital, Tier tier, uint256 expiresAt);
    event ConsentRevoked(address indexed patient, bytes32 indexed consentId);
    event EmergencyBreakGlassInvoked(address indexed patient, address indexed hospital, string category);

    constructor() Ownable(msg.sender) {}

    function grantConsent(
        address _hospital,
        Tier _tier,
        uint256 _durationHours,
        string memory _reason
    ) external returns (bytes32) {
        bytes32 consentId = keccak256(abi.encodePacked(msg.sender, _hospital, block.timestamp));
        uint256 expiresAt = block.timestamp + (_durationHours * 1 hours);

        patientConsents[msg.sender].push(Consent({
            consentId: consentId,
            hospital: _hospital,
            tier: _tier,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isRevoked: false,
            reason: _reason
        }));

        emit ConsentGranted(msg.sender, _hospital, _tier, expiresAt);
        return consentId;
    }

    function revokeConsent(bytes32 _consentId) external {
        Consent[] storage consents = patientConsents[msg.sender];
        for (uint256 i = 0; i < consents.length; i++) {
            if (consents[i].consentId == _consentId) {
                consents[i].isRevoked = true;
                emit ConsentRevoked(msg.sender, _consentId);
                break;
            }
        }
    }

    function invokeEmergencyBreakGlass(
        address _patient,
        string memory _category,
        string memory _notes
    ) external {
        patientEmergencies[_patient].push(EmergencyAccessLog({
            hospital: msg.sender,
            timestamp: block.timestamp,
            category: _category,
            notes: _notes,
            isFlagged: false
        }));

        emit EmergencyBreakGlassInvoked(_patient, msg.sender, _category);
    }
}
