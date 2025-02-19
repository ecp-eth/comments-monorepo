import { createConfig } from "ponder";
import { http, Transport } from "viem";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";

const networks = Object.entries(process.env).reduce(
  (acc, [key, value]) => {
    if (key.startsWith("PONDER_RPC_URL_")) {
      const chainId = parseInt(key.replace("PONDER_RPC_URL_", ""));
      const startBlock = parseInt(
        process.env[`PONDER_START_BLOCK_${chainId}`] || "0"
      );

      acc[chainId] = {
        chainId,
        transport: http(value),
        disableCache: chainId === 31337,
        startBlock,
      };
    }
    return acc;
  },
  {} as Record<
    string,
    {
      chainId: number;
      transport: Transport;
      disableCache?: boolean;
      startBlock?: number;
    }
  >
);

console.log(`Detected networks:`, networks);

const networkConfigs = Object.entries(networks).reduce(
  (acc, [chainId, network]) => {
    acc[chainId] = {
      address: COMMENTS_V1_ADDRESS,
      startBlock: network.startBlock,
    };
    return acc;
  },
  {} as Record<string, { address: `0x${string}`; startBlock?: number }>
);

export default createConfig({
  networks,
  contracts: {
    CommentsV1: {
      abi: CommentsV1Abi,
      network: networkConfigs,
    },
  },
  blocks: {
    Transactions: {
      network: networkConfigs,
      interval: 1,
    },
  },
});
