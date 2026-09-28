// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AuditLogger
 * @notice Immutable ledger for access, AI reads, consent updates, and patient misuse flags.
 */
contract AuditLogger is Ownable {
    struct AuditEntry {
        bytes32 logId;
        address patient;
        address actor;
        string eventType;
        string actionDetail;
        uint256 timestamp;
        bool isEmergency;
        bool isFlagged;
        string flagReason;
    }

    AuditEntry[] public globalAuditLogs;
    mapping(address => uint256[]) public patientLogIndices;

    event AuditLogged(bytes32 indexed logId, address indexed patient, string eventType, address actor);
    event AuditFlagged(bytes32 indexed logId, string flagReason);

    constructor() Ownable(msg.sender) {}

    function logEvent(
        address _patient,
        string memory _eventType,
        string memory _actionDetail,
        bool _isEmergency
    ) external returns (bytes32) {
        bytes32 logId = keccak256(abi.encodePacked(_patient, msg.sender, block.timestamp, globalAuditLogs.length));

        globalAuditLogs.push(AuditEntry({
            logId: logId,
            patient: _patient,
            actor: msg.sender,
            eventType: _eventType,
            actionDetail: _actionDetail,
            timestamp: block.timestamp,
            isEmergency: _isEmergency,
            isFlagged: false,
            flagReason: ""
        }));

        uint256 index = globalAuditLogs.length - 1;
        patientLogIndices[_patient].push(index);

        emit AuditLogged(logId, _patient, _eventType, msg.sender);
        return logId;
    }

    function flagMisuse(bytes32 _logId, string memory _flagReason) external {
        for (uint256 i = 0; i < globalAuditLogs.length; i++) {
            if (globalAuditLogs[i].logId == _logId) {
                require(globalAuditLogs[i].patient == msg.sender, "Only patient can flag misuse");
                globalAuditLogs[i].isFlagged = true;
                globalAuditLogs[i].flagReason = _flagReason;
                emit AuditFlagged(_logId, _flagReason);
                break;
            }
        }
    }
}
