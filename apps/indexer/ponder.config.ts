import { createConfig } from "ponder";
import { http, Transport } from "viem";
import {
  ChannelManagerABI,
  CommentManagerABI,
  SUPPORTED_CHAINS,
} from "@ecp.eth/sdk";
import type { Hex } from "@ecp.eth/sdk/core";
import { env } from "./src/env";

const chains = Object.entries(env.CHAIN_CONFIGS).reduce(
  (acc, [, chainConfig]) => {
    const { chainId, rpcUrl, startBlock } = chainConfig;

    acc[chainId] = {
      id: chainId,
      transport: http(rpcUrl),
      disableCache: chainId === 31337,
      startBlock:
        // allow override for start block, this is useful if you are using local anvil with base chain fork
        // so it doesn't reindex always from the beginning on indexer restart
        chainId === 31337 && env.CHAIN_ANVIL_START_BLOCK
          ? env.CHAIN_ANVIL_START_BLOCK
          : startBlock,
      channelManagerAddress:
        // allow override for manager address, this is useful if you are using local anvil with base chain fork
        // and in that case the deployed address of the contract is different because it uses different deployer private key
        chainId === 31337 &&
        env.CHAIN_ANVIL_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE
          ? env.CHAIN_ANVIL_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE
          : SUPPORTED_CHAINS[chainId].channelManagerAddress,
      commentManagerAddress:
        chainId === 31337 &&
        env.CHAIN_ANVIL_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE
          ? env.CHAIN_ANVIL_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE
          : SUPPORTED_CHAINS[chainId].commentManagerAddress,
    };
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
