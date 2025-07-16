import { createConfig } from "ponder";
import {
  ChannelManagerABI,
  CommentManagerABI,
  COMMENT_MANAGER_ADDRESS,
  CHANNEL_MANAGER_ADDRESS,
} from "@ecp.eth/sdk";
import { env } from "./src/env";
import { anvil, base } from "viem/chains";
import { BroadcastHookABI } from "./src/abi/generated/broadcast-hook-abi";

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
        startBlock: Math.min(
          env.CHAIN_BASE_BROADCAST_HOOK_START_BLOCK || 0,
          env.CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK || 0,
          env.CHAIN_BASE_COMMENT_MANAGER_START_BLOCK || 0,
        ),
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
            address: CHANNEL_MANAGER_ADDRESS,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: CHANNEL_MANAGER_ADDRESS,
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
            address: COMMENT_MANAGER_ADDRESS,
          },
        }),
        ...(env.CHAIN_BASE_BROADCAST_HOOK_ADDRESS && {
          base: {
            address: COMMENT_MANAGER_ADDRESS,
            startBlock: env.CHAIN_BASE_COMMENT_MANAGER_START_BLOCK,
          },
        }),
      },
    },
  },
});
