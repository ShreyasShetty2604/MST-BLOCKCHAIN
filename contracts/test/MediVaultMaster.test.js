import { expect } from "chai";
import hre from "hardhat";

describe("MediVaultMaster Contract Suite", function () {
  let masterContract;
  let owner, patient, hospital1, hospital2, attacker;

  beforeEach(async function () {
    [owner, patient, hospital1, hospital2, attacker] = await hre.ethers.getSigners();

    const MediVaultMaster = await hre.ethers.getContractFactory("MediVaultMaster");
    masterContract = await MediVaultMaster.deploy();
    await masterContract.waitForDeployment();
  });

  describe("1. Vault Registry", function () {
    it("should create vault with random vaultId and emit VaultCreated", async function () {
      const randomVaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-2345-6789-0123"));

      await expect(masterContract.connect(patient).createVault(randomVaultId, healthIdHash))
        .to.emit(masterContract, "VaultCreated")
        .withArgs(randomVaultId, healthIdHash, patient.address);

      const vault = await masterContract.vaults(randomVaultId);
      expect(vault.exists).to.be.true;
      expect(vault.owner).to.equal(patient.address);
    });

    it("should reject duplicate healthIdHashes", async function () {
      const vaultId1 = hre.ethers.randomBytes(32);
      const vaultId2 = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-2345-6789-0123"));

      await masterContract.connect(patient).createVault(vaultId1, healthIdHash);

      await expect(
        masterContract.connect(attacker).createVault(vaultId2, healthIdHash)
      ).to.be.revertedWith("Health ID hash already registered");
    });
  });

  describe("2. Hospital Registry", function () {
    it("should allow admin to add and remove hospitals with trust score", async function () {
      await expect(masterContract.connect(owner).addHospital(hospital1.address, "City General Hospital"))
        .to.emit(masterContract, "HospitalAdded")
        .withArgs(hospital1.address, "City General Hospital");

      const hosp = await masterContract.hospitals(hospital1.address);
      expect(hosp.isApproved).to.be.true;
      expect(hosp.trustScore).to.equal(1000); // 100.0%

      await expect(masterContract.connect(owner).removeHospital(hospital1.address))
        .to.emit(masterContract, "HospitalRemoved")
        .withArgs(hospital1.address);
    });
  });

  describe("3. Records & Versioning", function () {
    it("should anchor record and auto-increment version", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-1111-2222-3333"));
      await masterContract.connect(patient).createVault(vaultId, healthIdHash);

      const payload1 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("HbA1c v1 Report"));
      const tx1 = await masterContract.connect(patient).addRecord(
        vaultId,
        payload1,
        "Lab Report",
        "City General",
        hre.ethers.ZeroHash
      );
      const receipt1 = await tx1.wait();
      const recordId1 = receipt1.logs[0].args[1];

      // Add v2 linking to previous record
      const payload2 = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("HbA1c v2 Report"));
      const tx2 = await masterContract.connect(patient).addRecord(
        vaultId,
        payload2,
        "Lab Report",
        "City General",
        recordId1
      );
      const receipt2 = await tx2.wait();
      const recordId2 = receipt2.logs[0].args[1];

      const recordItem = await masterContract.records(vaultId, recordId2);
      expect(recordItem.version).to.equal(2);
      expect(recordItem.previousRecordId).to.equal(recordId1);
    });
  });

  describe("4. Consents & Access Control", function () {
    it("should grant time-bound consent and handle revocation", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-4444-5555-6666"));
      await masterContract.connect(patient).createVault(vaultId, healthIdHash);

      const expiry = Math.floor(Date.now() / 1000) + 3600; // +1 hour

      await masterContract.connect(patient).grantAccess(vaultId, hospital1.address, 2, expiry);

      const hasAcc = await masterContract.hasAccess(vaultId, hospital1.address, 2);
      expect(hasAcc).to.be.true;

      await masterContract.connect(patient).revokeAccess(vaultId, hospital1.address);
      const hasAccRevoked = await masterContract.hasAccess(vaultId, hospital1.address, 2);
      expect(hasAccRevoked).to.be.false;
    });
  });

  describe("5. Emergency Access & Abuse Control", function () {
    it("should allow break-glass access and drop trust score on misuse flag", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-7777-8888-9999"));
      await masterContract.connect(patient).createVault(vaultId, healthIdHash);
      await masterContract.connect(owner).addHospital(hospital1.address, "Sunrise Hospital ER");

      await expect(
        masterContract.connect(hospital1).emergencyAccess(vaultId, "Acute Trauma", "Unconscious patient admitted")
      )
        .to.emit(masterContract, "EmergencyAccessed")
        .withArgs(vaultId, hospital1.address, "Acute Trauma", "Unconscious patient admitted");

      const auditLog = await masterContract.auditLogs(0);
      const logId = auditLog.logId;

      // Patient flags misuse -> Trust score drops by -50 (-5.0%)
      await masterContract.connect(patient).flagMisuse(vaultId, logId, "Was not at hospital");
      const hosp = await masterContract.hospitals(hospital1.address);
      expect(hosp.trustScore).to.equal(950); // 1000 - 50 = 950
    });
  });
});
