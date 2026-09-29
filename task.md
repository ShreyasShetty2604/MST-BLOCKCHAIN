# MediVault (MediID) — Hackathon Task List

## 0. The Central Idea (everyone read this first)

**One sentence:** A patient-controlled medical records vault where consent, access history and record integrity are cryptographically provable, not just a database flag a hospital controls.

**Pitch line:** ABHA and DigiLocker treat consent as a mutable database flag. We make consent and the audit trail tamper-evident, and we make record integrity verifiable.

**Two layers:**
- Trust layer (blockchain): health ID uniqueness, record integrity hashes, consent, audit log, emergency access. Features 1, 3, 5.
- Intelligence layer (AI and rules): health assistant, diet plan, checkup reminders. Features 4, 6, 7. These do NOT need blockchain, and we say so openly.

**Golden rules**
1. Never on-chain: medical data, biometrics, DNA, plain health ID, chat messages. Only hashes and events.
2. The chain is the gate: backend must call `hasAccess(vaultId, hospital)` before decrypting or returning any record.
3. AI never diagnoses, never prescribes, never gives dosages. Red-flag rules run BEFORE the LLM.
4. Calories and nutrition numbers are computed in code (Mifflin-St Jeor). The LLM only arranges foods.
5. Be honest about what is faked. Judges reward that.

---

## 1. Real vs Fake vs Roadmap

| Item | Status |
|---|---|
| Smart contract (vault, hospital registry, records, consent, emergency, events) | REAL |
| Record hashing, encryption (AES-GCM), integrity check | REAL |
| Health ID generation with checksum, HMAC-hashed on-chain | REAL |
| Consent grant / revoke / expiry, audit log | REAL |
| Hospital signature on records (ethers `signMessage`) | REAL |
| Patient approves access via passkey (WebAuthn) | REAL if time, else mock |
| AI assistant with red-flag rules | REAL (simple) |
| Diet plan (rules + LLM) and reminders (rule engine) | REAL (simple) |
| Fingerprint scan | MOCK (WebAuthn optional) |
| DNA ID | MOCK (salted hash only) |
| OTP, SMS, notifications | MOCK |
| Hospital-side fingerprint scanner, ABHA link, ZK proofs, offline access, ERC-4337 | ROADMAP |

---

## 2. Team Roles (rename to your actual people)

- **A: Contract lead.** Solidity, deployment, ethers integration, relayer.
- **B: Backend lead.** Node/Express, health ID, encryption, storage, AI service, reminder engine.
- **C: Frontend lead.** Antigravity UI build, wiring UI to mock layer, then real API.
- **D: Demo and pitch lead.** Seed data, demo script, deck, backup recording, judge Q&A prep. Also helps with testing and glue tasks.

If solo: follow the phase order below and use the cut list in section 6.

---

## 3. Before the Hackathon (prep, do NOT skip)

- [ ] Create MetaMask wallets: admin, 2 hospital wallets, 1 relayer
- [ ] Pre-fund all wallets with testnet tokens (MST Testnet - Chain ID: 91562037). Faucets fail on event day.
- [ ] Set up Remix or Hardhat, confirm a "hello world" contract deploys
- [ ] Set up a local Hardhat chain as a fallback if the testnet is down
- [ ] Get an LLM API key and test one call
- [ ] Prepare a mock LLM response file for demo prompts (in case venue wifi fails)
- [ ] Create the repo, agree on folder structure (`/contracts`, `/backend`, `/frontend`)
- [ ] Agree on API endpoint list so frontend mock layer maps 1:1 to backend
- [ ] Read section 0 together and agree on the pitch line

---

## 4. Build Phases (24 hours, priority-ordered)

### Phase 1: Setup and scope lock (Hours 0-2)
- [ ] Lock scope using section 1
- [ ] Repo, backend skeleton, frontend scaffold running
- [ ] Hello-world contract deployed and called from ethers.js
- [ ] Frontend: run the Antigravity UI prompt; scaffold routing, design tokens, mock API, shared components

### Phase 2: Smart contract (Hours 2-7) — Owner: A
- [ ] Vault registry: `createVault(vaultId, healthIdHash)`, reject duplicate hashes
- [ ] Hospital registry: `addHospital`, `removeHospital` (admin only), trust score field
- [ ] Records: `addRecord(vaultId, hash, type, source, previousRecordId)` with versioning
- [ ] Consent: `grantAccess(vaultId, hospital, tier, expiry)`, `revokeAccess`, `hasAccess` view
- [ ] Access and audit: `accessRecord`, `emergencyAccess(vaultId, reason)` (Tier 1 only), `flagMisuse`
- [ ] Emergency abuse control: per-hospital rate limit, reason category, trust score drop on misuse
- [ ] Extras: `logAIAccess(vaultId)` (one per chat session), `logCheckup(vaultId, type)`
- [ ] Events: VaultCreated, RecordAdded, ConsentGranted, ConsentRevoked, AccessLogged, EmergencyAccessed, MisuseFlagged, AIAccessed, CheckupCompleted
- [ ] Use a RANDOM vaultId (not derived from the person or health ID)

### Phase 3: Deploy and test contract (Hours 7-9) — Owner: A
- [ ] Deploy to testnet, save address and ABI to a shared file
- [ ] Test every function, including expiry, revoke, duplicate ID, non-approved hospital
- [ ] Hand the ABI to B and C

### Phase 4: Backend core (Hours 9-12) — Owner: B
- [ ] Health ID generator: 14 digits plus Verhoeff or Luhn checksum, formatted `91-2345-6789-0123`
- [ ] Hash the ID with HMAC-SHA256 and a server-side secret (pepper), never plain SHA-256
- [ ] Relayer wallet service (pays gas)
- [ ] Record upload: hash plaintext, encrypt with AES-GCM, store ciphertext (Pinata or local folder)
- [ ] Access gate: every read calls `hasAccess` on-chain first
- [ ] Integrity check endpoint: decrypt, rehash, compare with chain
- [ ] Hospital signature verification: signature must recover to an approved hospital address

### Phase 5: Frontend (Hours 12-16) — Owner: C
Build in this order (from the UI prompt):
- [ ] Onboarding stepper and HealthIdCard
- [ ] Patient Home (stats, emergency card)
- [ ] Records timeline with badges, "Verify integrity", "Run full integrity scan"
- [ ] Access tab: incoming requests, approve flow, active consents, audit log
- [ ] Hospital portal: lookup, request access, add record with "Sign with wallet", break-glass
- [ ] Admin portal: hospital registry, misuse flags, stats
- [ ] Add PendingChainChip (optimistic UI) so the demo never freezes on block time

### Phase 6: Identity and emergency flow (Hours 16-18) — Owners: B + C
- [ ] Real flow: hospital enters MediID or scans QR, sends request, patient approves on their own phone with passkey
- [ ] WebAuthn passkey enrolment, or "Mock scan" fallback
- [ ] Emergency break-glass end to end: Tier 1 only, patient notified, visible in audit log, "Flag as misuse" works

### Phase 7: AI assistant (Hours 18-20) — Owner: B (UI: C)
- [ ] Red-flag keyword rules run first (chest pain, breathlessness, unconscious, etc.) and show "Seek emergency care now"
- [ ] LLM call with strict system prompt; send only needed fields (age, conditions, allergies)
- [ ] Structured answer: general pointers, what you can do now, when to see a doctor
- [ ] Fixed disclaimer: "This is guidance, not a medical diagnosis."
- [ ] "Using: age, conditions, allergies" pill with share-less toggle
- [ ] One on-chain `AIAccessed` event per session

### Phase 8: Diet and reminders (Hours 20-22) — Owner: B (UI: C)
- [ ] Mifflin-St Jeor plus activity multiplier in code; macro targets
- [ ] Rule layer: diabetes means low GI and less sugar; allergies mean exclusions
- [ ] LLM arranges Indian-friendly meals within numeric targets (1-day first, 7-day only if time)
- [ ] Reminder rule table: diabetes (HbA1c 3-6 months, eye and foot yearly), hypertension (BP 1-3 months), 40+ (annual checkup)
- [ ] Hospital adds a checkup report, so last-done resets and next-due recomputes
- [ ] "Due in 12 days" and "Overdue" badges, mock toast notification
- [ ] Optional: `CheckupCompleted` on-chain event

### Phase 9: Polish and demo prep (Hours 22-24) — Owner: D (everyone helps)
- [ ] Integrity check button and tamper demo working (edit ciphertext on disk, red alert appears)
- [ ] Seed 3 personas: diabetic 52y, healthy 25y, hypertensive 60y, with 8-12 records each
- [ ] Demo tools drawer (load persona, tamper record, trigger hospital request, trigger emergency, fast-forward 30 days, reset)
- [ ] Pitch deck
- [ ] Rehearse the 5-minute demo at least twice
- [ ] Record a backup demo video at hour 22

---

## 5. Definition of Done (per feature)

- [ ] **Medical history:** record added, hash on-chain, timeline shows Verified or Self-declared, versioning works
- [ ] **Health ID:** generated, checksum valid, duplicate rejected on-chain, QR shown on card
- [ ] **Access control:** grant, view, revoke, and denial after revoke are all demonstrable
- [ ] **Emergency:** Tier 1 only, permanent log, patient sees it, misuse can be flagged
- [ ] **Integrity:** tampered file produces a red alert with expected vs found hash
- [ ] **AI:** red flags escalate before the LLM, disclaimer always visible, fields shared are visible
- [ ] **Diet:** numbers come from code, exclusions respected
- [ ] **Reminders:** due dates recompute after a hospital checkup record

---

## 6. If We Fall Behind (cut order)

1. DNA ID
2. Real WebAuthn (use the mock scan)
3. Merkle root
4. 7-day diet plan (keep 1-day)
5. On-chain checkup event

**NEVER cut:** consent, audit log, hash verification, emergency access.

---

## 7. Demo Script (about 5 minutes)

1. Problem: no portable, patient-controlled health record, and no trust in who saw your data
2. Self-register, enrol fingerprint, get the MediID card
3. Add history, then a hospital adds a signed, verified prescription
4. Consent: grant 2-hour access, hospital views, patient revokes, hospital denied
5. Emergency: break-glass, Tier 1 card shown, patient alerted
6. Tamper check: edit a stored file, integrity scan shows red alert
7. AI assistant: diabetic persona reports symptoms, gets precautions (red flag demo optional)
8. Diet plan and "HbA1c due in 12 days" reminder
9. Roadmap: DNA-linked ID, ABHA integration, ZK proofs, offline access, user-held keys (ERC-4337)

---

## 8. Judge Q&A (D owns, everyone memorises)

- **Why blockchain if AI, diet and reminders don't need it?** It secures the trust-critical parts (consent, audit, integrity, ID uniqueness). AI works only on what the patient allowed.
- **Isn't the relayer custodial?** Patient intent is authenticated by passkey; the relayer only pays gas. Roadmap: user-held keys with account abstraction and social recovery.
- **Is the ID an ABHA?** No, it is an ABHA-style prototype ID. Roadmap is real ABHA integration.
- **Can the AI harm someone?** Precautions only, red flags escalate first, never prescribes.
- **What if the hospital is fake?** Only admin-approved addresses act as hospitals.
- **What stops a doctor copying data?** Nothing technical can, but access is logged and traceable, which deters misuse.
- **Right to erasure vs immutable chain?** Only hashes and events are on-chain. Delete the off-chain file and key, and the hash means nothing.
- **Patient unconscious with no phone?** Break-glass Tier 1 exists exactly for this.
- **Who pays gas at scale?** Hospitals or government via relayer; an L2 makes it fractions of a cent.
- **Compliance?** Prototype. Real version needs DPDP Act compliance and ABHA integration.

---

## 9. Risk Checklist

- [ ] Wallets pre-funded
- [ ] Local Hardhat fallback ready
- [ ] Mock LLM responses ready
- [ ] Optimistic "pending on-chain" UI in place
- [ ] Seeded personas, no live typing during demo
- [ ] Backup recording done
- [ ] Everyone can explain section 0 in 30 seconds
