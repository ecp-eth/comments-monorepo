import { createConfig } from "ponder";
import { http, Transport } from "viem";
import {
  ChannelManagerABI,
  CommentManagerABI,
  SUPPORTED_CHAINS,
  type SupportedChainConfig,
} from "@ecp.eth/sdk";
import type { Hex } from "@ecp.eth/sdk/core";

const chains = Object.entries(process.env).reduce(
  (acc, [key, value]) => {
    if (key.startsWith("PONDER_RPC_URL_")) {
      const chainId = parseInt(key.replace("PONDER_RPC_URL_", ""));
      const startBlock = parseInt(
        process.env[`PONDER_START_BLOCK_${chainId}`] || "0",
      );

      const supportedChain: SupportedChainConfig | undefined =
        SUPPORTED_CHAINS[chainId as keyof typeof SUPPORTED_CHAINS];

      if (!supportedChain) {
        throw new Error(`Chain ${chainId} not supported by ECP`);
      }

      acc[chainId] = {
        id: chainId,
        transport: http(value),
        disableCache: chainId === 31337,
        startBlock,
        channelManagerAddress: supportedChain.channelManagerAddress,
        commentManagerAddress: supportedChain.commentManagerAddress,
      };
    }
    return acc;
  },
  {} as Record<
    string,
    {
      id: number;
      transport: Transport;
      disableCache?: boolean;
      startBlock?: number;
      channelManagerAddress: Hex;
      commentManagerAddress: Hex;
    }
  >,
);

console.log(`Detected chains:`, chains);

export default createConfig({
  chains,
  contracts: {
    CommentsV1: {
      abi: CommentManagerABI,
      chain: Object.entries(chains).reduce(
        (acc, [chainId, network]) => {
          acc[chainId] = {
            address: network.commentManagerAddress,
            startBlock: network.startBlock,
          };
          return acc;
        },
        {} as Record<string, { address: `0x${string}`; startBlock?: number }>,
      ),
    },
    CommentsV1ChannelManager: {
      abi: ChannelManagerABI,
      chain: Object.entries(chains).reduce(
        (acc, [chainId, network]) => {
          acc[chainId] = {
            address: network.channelManagerAddress,
            startBlock: network.startBlock,
          };
          return acc;
        },
        {} as Record<string, { address: `0x${string}`; startBlock?: number }>,
      ),
    },
  },
});
