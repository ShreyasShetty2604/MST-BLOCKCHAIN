# MediVault API Endpoint & Smart Contract Specification

This document maps all frontend service layer methods (`src/mock/api.ts`) 1:1 to backend REST endpoints and Solidity smart contract calls.

## 1. REST / RPC Endpoint Mapping Table

| Feature Area | Frontend Method | Backend REST Endpoint | Smart Contract Call |
|--------------|-----------------|-----------------------|---------------------|
| **Patient Profile** | `getCurrentPatient()` | `GET /api/patient/me` | `MediVaultCore.getPatient(address)` |
| **Lookup Patient** | `getPatientById(mediId)` | `GET /api/patient/:mediId` | `MediVaultCore.lookupByMediId(bytes32)` |
| **Get Records** | `getRecords(category)` | `GET /api/records?category=X` | `MediVaultCore.getRecordHashes(address)` |
| **Add Self Record** | `addSelfDeclaredRecord(input)` | `POST /api/records/self` | `AuditLogger.logRecordAnchor(bytes32, string)` |
| **Add Hospital Record**| `addHospitalRecord(...)` | `POST /api/records/hospital` | `MediVaultCore.anchorHospitalRecord(...)` |
| **Verify Integrity** | `verifyRecordIntegrity(id)` | `POST /api/verify/record` | `MediVaultCore.verifyHash(bytes32, bytes32)` |
| **Full Vault Scan** | `runFullIntegrityScan()` | `POST /api/verify/scan-all` | Batch `verifyHash()` calls |
| **Get Consents** | `getConsents()` | `GET /api/consents` | `ConsentManager.getActiveConsents(address)` |
| **Grant Consent** | `grantConsent(...)` | `POST /api/consents/grant` | `ConsentManager.grantConsent(address, uint8, uint256)` |
| **Revoke Consent** | `revokeConsent(consentId)` | `POST /api/consents/revoke` | `ConsentManager.revokeConsent(bytes32)` |
| **Emergency Access** | `triggerEmergencyBreakGlass(...)` | `POST /api/emergency/break-glass` | `ConsentManager.logEmergencyBreakGlass(...)` |
| **Audit Logs** | `getAuditLogs()` | `GET /api/audit-logs` | `AuditLogger.getLogs(address)` |
| **Flag Misuse** | `flagAuditLog(id, reason)` | `POST /api/audit-logs/flag` | `AuditLogger.flagMisuse(bytes32, string)` |
| **AI Assistant** | Query Assistant | `POST /api/ai/guidance` | `AuditLogger.logAiAccess(address, string[])` |

---

## 2. Smart Contract Architecture

```
                 +-----------------------+
                 |    MediVaultCore      |
                 | (Patient & Record Reg)|
                 +-----------+-----------+
                             |
         +-------------------+-------------------+
         |                                       |
+--------v--------------+               +--------v--------------+
|    ConsentManager     |               |     AuditLogger       |
| (Time-Bound & Tiers)  |               | (Immutable Event Log) |
+-----------------------+               +-----------------------+
```

1. **`MediVaultCore.sol`**: Maps MediID (`91-2345-6789-0123`) to patient vault address. Stores SHA-256 payload hashes.
2. **`ConsentManager.sol`**: Manages Tier 1 (Emergency Card) & Tier 2 (Full History) time-bound permissions. Triggers Emergency Break-Glass override with forced audit logging.
3. **`AuditLogger.sol`**: Immutable ledger for routine accesses, AI profile reads, consent changes, and break-glass events. Supports patient misuse flags.
