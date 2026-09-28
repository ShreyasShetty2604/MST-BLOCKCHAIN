import hre from "hardhat";

async function main() {
  console.log("Deploying MediVault contracts to network:", hre.network.name);

  const MediVaultMaster = await hre.ethers.getContractFactory("MediVaultMaster");
  const master = await MediVaultMaster.deploy();
  await master.waitForDeployment();
  console.log("MediVaultMaster deployed to:", await master.getAddress());

  const MediVaultCore = await hre.ethers.getContractFactory("MediVaultCore");
  const mediVaultCore = await MediVaultCore.deploy();
  await mediVaultCore.waitForDeployment();
  console.log("MediVaultCore deployed to:", await mediVaultCore.getAddress());

  const ConsentManager = await hre.ethers.getContractFactory("ConsentManager");
  const consentManager = await ConsentManager.deploy();
  await consentManager.waitForDeployment();
  console.log("ConsentManager deployed to:", await consentManager.getAddress());

  const AuditLogger = await hre.ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  console.log("AuditLogger deployed to:", await auditLogger.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
