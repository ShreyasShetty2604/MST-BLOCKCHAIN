import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("=== Phase 3: Deploy & Export Contract ABIs ===");
  console.log("Network:", hre.network.name);

  // Deploy MediVaultMaster
  const MediVaultMaster = await hre.ethers.getContractFactory("MediVaultMaster");
  const master = await MediVaultMaster.deploy();
  await master.waitForDeployment();
  const masterAddr = await master.getAddress();
  console.log("✅ MediVaultMaster Address:", masterAddr);

  // Deploy Legacy Sub-contracts
  const MediVaultCore = await hre.ethers.getContractFactory("MediVaultCore");
  const mediVaultCore = await MediVaultCore.deploy();
  await mediVaultCore.waitForDeployment();
  const coreAddr = await mediVaultCore.getAddress();

  const ConsentManager = await hre.ethers.getContractFactory("ConsentManager");
  const consentManager = await ConsentManager.deploy();
  await consentManager.waitForDeployment();
  const consentAddr = await consentManager.getAddress();

  const AuditLogger = await hre.ethers.getContractFactory("AuditLogger");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.waitForDeployment();
  const auditAddr = await auditLogger.getAddress();

  // Read Artifact ABIs
  const masterArtifact = await hre.artifacts.readArtifact("MediVaultMaster");
  const coreArtifact = await hre.artifacts.readArtifact("MediVaultCore");
  const consentArtifact = await hre.artifacts.readArtifact("ConsentManager");
  const auditArtifact = await hre.artifacts.readArtifact("AuditLogger");

  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    deployedAt: new Date().toISOString(),
    contracts: {
      MediVaultMaster: { address: masterAddr, abi: masterArtifact.abi },
      MediVaultCore: { address: coreAddr, abi: coreArtifact.abi },
      ConsentManager: { address: consentAddr, abi: consentArtifact.abi },
      AuditLogger: { address: auditAddr, abi: auditArtifact.abi }
    }
  };

  // Target Export Locations
  const jsonExportPath = path.join(__dirname, "../deployments.json");
  const frontendJsonExportPath = path.join(__dirname, "../../src/contracts/deployedContracts.json");
  const frontendTsExportPath = path.join(__dirname, "../../src/contracts/contractAbi.ts");

  // Ensure directories exist
  const frontendDir = path.dirname(frontendJsonExportPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }

  // Save JSON deployments
  fs.writeFileSync(jsonExportPath, JSON.stringify(deploymentData, null, 2));
  fs.writeFileSync(frontendJsonExportPath, JSON.stringify(deploymentData, null, 2));

  // Save TypeScript Typed ABI
  const tsContent = `// Auto-generated Phase 3 Contract ABIs & Deployment Addresses
export const DEPLOYED_CONTRACTS = ${JSON.stringify(deploymentData, null, 2)} as const;

export const MEDIVAULT_MASTER_ADDRESS = "${masterAddr}";
export const MEDIVAULT_MASTER_ABI = ${JSON.stringify(masterArtifact.abi, null, 2)} as const;
`;
  fs.writeFileSync(frontendTsExportPath, tsContent);

  console.log("✅ Contract ABIs and addresses exported to:");
  console.log("   - contracts/deployments.json");
  console.log("   - src/contracts/deployedContracts.json");
  console.log("   - src/contracts/contractAbi.ts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
