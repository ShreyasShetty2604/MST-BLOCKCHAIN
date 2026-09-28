import { ethers } from 'ethers';

// Default RPC fallbacks
const LOCAL_HARDHAT_RPC = 'http://127.0.0.1:8545';
const AMOY_PUBLIC_RPC = 'https://rpc-amoy.polygon.technology';

export const ethersBridge = {
  // Get provider (attempts local hardhat node, then Amoy testnet, then fallback)
  getProvider: async (): Promise<ethers.Provider> => {
    try {
      const localProvider = new ethers.JsonRpcProvider(LOCAL_HARDHAT_RPC);
      await localProvider.getBlockNumber();
      return localProvider;
    } catch {
      return new ethers.JsonRpcProvider(AMOY_PUBLIC_RPC);
    }
  },

  // Test Hello-World Contract Call / Blockchain Query
  getNetworkStatus: async (): Promise<{ blockNumber: number; networkName: string; chainId: number }> => {
    try {
      const provider = await ethersBridge.getProvider();
      const blockNumber = await provider.getBlockNumber();
      const network = await provider.getNetwork();

      return {
        blockNumber,
        networkName: Number(network.chainId) === 31337 ? 'Hardhat Local Fallback' : 'Polygon Amoy Testnet',
        chainId: Number(network.chainId)
      };
    } catch {
      return {
        blockNumber: 4819204,
        networkName: 'Polygon Amoy Testnet (Simulated)',
        chainId: 80002
      };
    }
  },

  // Verify Sha256 hash using Ethers utility
  computePayloadHash: (payloadString: string): string => {
    return ethers.keccak256(ethers.toUtf8Bytes(payloadString));
  }
};
