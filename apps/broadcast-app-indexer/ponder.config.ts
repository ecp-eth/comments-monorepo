import { createConfig } from "ponder";
import {
  ChannelManagerABI,
  CommentManagerABI,
  SUPPORTED_CHAINS,
} from "@ecp.eth/sdk";
import { env } from "./src/env";
import { anvil, base } from "viem/chains";
import { BroadcastHookABI } from "./src/abi/generated/broadcast-hook-abi";
import { efpListRecordsAbi } from "./src/abi/generated/efp-abi";

export default createConfig({
  chains: {
    ...(env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS && {
      anvil: {
        id: anvil.id,
        rpc: env.CHAIN_ANVIL_RPC_URL,
        disableCache: true,
      },
    }),
    ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
      base: {
        id: base.id,
        rpc: env.CHAIN_BASE_RPC_URL,
        startBlock:
          env.CHAIN_BASE_BROADCAST_HOOK_START_BLOCK ??
          env.CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK ??
          env.CHAIN_BASE_COMMENT_MANAGER_START_BLOCK,
      },
    }),
  },
  contracts: {
    BroadcastHook: {
      abi: BroadcastHookABI,
      chain: {
        ...(env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS && {
          anvil: {
            address: env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS,
            startBlock: env.CHAIN_ANVIL_START_BLOCK,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS,
            startBlock: env.CHAIN_BASE_BROADCAST_HOOK_START_BLOCK,
          },
        }),
      },
    },
    ChannelManager: {
      abi: ChannelManagerABI,
      chain: {
        ...(env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS && {
          anvil: {
            address:
              env.CHAIN_ANVIL_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE ||
              SUPPORTED_CHAINS[31337].channelManagerAddress,
            startBlock: env.CHAIN_ANVIL_START_BLOCK,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: SUPPORTED_CHAINS[8453].channelManagerAddress,
            startBlock: env.CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK,
          },
        }),
      },
    },
    CommentManager: {
      abi: CommentManagerABI,
      chain: {
        ...(env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS && {
          anvil: {
            address:
              env.CHAIN_ANVIL_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE ||
              SUPPORTED_CHAINS[31337].commentManagerAddress,
            startBlock: env.CHAIN_ANVIL_START_BLOCK,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: SUPPORTED_CHAINS[8453].commentManagerAddress,
            startBlock: env.CHAIN_BASE_COMMENT_MANAGER_START_BLOCK,
          },
        }),
      },
    },
    EFPListRecords: {
      abi: efpListRecordsAbi,
      chain: {
        ...(env.CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS && {
          anvil: {
            address: env.EFP_LIST_RECORDS_ADDRESS,
            startBlock: env.CHAIN_ANVIL_START_BLOCK,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: env.EFP_LIST_RECORDS_ADDRESS,
            startBlock:
              env.CHAIN_BASE_EFP_LIST_RECORDS_START_BLOCK ??
              env.CHAIN_BASE_START_BLOCK,
          },
        }),
      },
    },
  },
});
