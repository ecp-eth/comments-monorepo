import { createConfig } from "ponder";
import { http, Transport } from "viem";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";

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

export default createConfig({
  networks,
  contracts: {
    CommentsV1: {
      abi: CommentsV1Abi,
      network: Object.entries(networks).reduce(
        (acc, [chainId, network]) => {
          acc[chainId] = {
            address: "0xefb67414d903385437eff1e10c1e193f44a0f7e1",
            startBlock: network.startBlock,
          };
          return acc;
        },
        {} as Record<string, { address: `0x${string}`; startBlock?: number }>
      ),
    },
  },
});
