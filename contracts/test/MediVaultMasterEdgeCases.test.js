import { expect } from "chai";
import hre from "hardhat";

describe("Phase 3: Smart Contract Deep Edge Cases & Security Test", function () {
  let master;
  let owner, patient, hospital1, hospital2, unapprovedHospital, attacker;

  beforeEach(async function () {
    [owner, patient, hospital1, hospital2, unapprovedHospital, attacker] = await hre.ethers.getSigners();

    const MediVaultMaster = await hre.ethers.getContractFactory("MediVaultMaster");
    master = await MediVaultMaster.deploy();
    await master.waitForDeployment();

    // Setup approved hospital
    await master.connect(owner).addHospital(hospital1.address, "City General Hospital");
  });

  describe("1. Expiry & Revocation Testing", function () {
    it("should deny access after consent expiry time passes", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-EXPIRY-TEST"));
      await master.connect(patient).createVault(vaultId, healthIdHash);

      const currentBlock = await hre.ethers.provider.getBlock("latest");
      const shortExpiry = currentBlock.timestamp + 10; // +10 seconds

      await master.connect(patient).grantAccess(vaultId, hospital1.address, 2, shortExpiry);

      expect(await master.hasAccess(vaultId, hospital1.address, 2)).to.be.true;

      // Fast forward time past expiry (+20 seconds)
      await hre.ethers.provider.send("evm_increaseTime", [20]);
      await hre.ethers.provider.send("evm_mine");

      expect(await master.hasAccess(vaultId, hospital1.address, 2)).to.be.false;
    });

    it("should immediately deny access after patient revokes consent", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-REVOKE-TEST"));
      await master.connect(patient).createVault(vaultId, healthIdHash);

      const currentBlock = await hre.ethers.provider.getBlock("latest");
      const expiry = currentBlock.timestamp + 3600;

      await master.connect(patient).grantAccess(vaultId, hospital1.address, 2, expiry);
      expect(await master.hasAccess(vaultId, hospital1.address, 2)).to.be.true;

      await expect(master.connect(patient).revokeAccess(vaultId, hospital1.address))
        .to.emit(master, "ConsentRevoked")
        .withArgs(vaultId, hospital1.address);

      expect(await master.hasAccess(vaultId, hospital1.address, 2)).to.be.false;
    });
  });

  describe("2. Duplicate ID & Non-Owner Protection", function () {
    it("should revert when attempting to register duplicate health ID or vault ID", async function () {
      const vaultId1 = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-DUP-TEST"));

      await master.connect(patient).createVault(vaultId1, healthIdHash);

      // Attempt duplicate health ID
      const vaultId2 = hre.ethers.randomBytes(32);
      await expect(
        master.connect(attacker).createVault(vaultId2, healthIdHash)
      ).to.be.revertedWith("Health ID hash already registered");

      // Attempt duplicate vault ID
      const newHealthHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-NEW-HEALTH"));
      await expect(
        master.connect(attacker).createVault(vaultId1, newHealthHash)
      ).to.be.revertedWith("Vault ID already exists");
    });

    it("should revert when non-owner attempts to grant/revoke consent", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-NONOWNER-TEST"));
      await master.connect(patient).createVault(vaultId, healthIdHash);

      const currentBlock = await hre.ethers.provider.getBlock("latest");
      const expiry = currentBlock.timestamp + 3600;

      await expect(
        master.connect(attacker).grantAccess(vaultId, hospital1.address, 2, expiry)
      ).to.be.revertedWith("Only vault owner can grant consent");

      await expect(
        master.connect(attacker).revokeAccess(vaultId, hospital1.address)
      ).to.be.revertedWith("Only vault owner can revoke consent");
    });
  });

  describe("3. Non-Approved Hospital & Emergency Abuse Control", function () {
    it("should revert when non-approved hospital attempts break-glass emergency access", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-UNAPPROVED-TEST"));
      await master.connect(patient).createVault(vaultId, healthIdHash);

      await expect(
        master.connect(unapprovedHospital).emergencyAccess(vaultId, "Trauma", "Illegal attempt")
      ).to.be.revertedWith("Only approved hospitals can trigger break-glass");
    });

    it("should enforce emergency access rate limiting per hospital", async function () {
      const vaultId = hre.ethers.randomBytes(32);
      const healthIdHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("91-RATELIMIT-TEST"));
      await master.connect(patient).createVault(vaultId, healthIdHash);

      // Perform 3 valid emergency accesses within 1 hour
      await master.connect(hospital1).emergencyAccess(vaultId, "Triage 1", "Emergency 1");
      await master.connect(hospital1).emergencyAccess(vaultId, "Triage 2", "Emergency 2");
      await master.connect(hospital1).emergencyAccess(vaultId, "Triage 3", "Emergency 3");

      // 4th attempt in same hour must revert due to rate limit
      await expect(
        master.connect(hospital1).emergencyAccess(vaultId, "Triage 4", "Emergency 4")
      ).to.be.revertedWith("Emergency rate limit exceeded for hospital");
    });
  });
});
