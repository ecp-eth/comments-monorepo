import { publicEnv } from "@/env/public";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";

export const chain = SUPPORTED_CHAINS[publicEnv.NEXT_PUBLIC_CHAIN_ID].chain;

export const COMMENT_MANAGER_ADDRESS =
  publicEnv.NEXT_PUBLIC_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE ||
  SUPPORTED_CHAINS[chain.id as keyof typeof SUPPORTED_CHAINS]
    .commentManagerAddress;

export const CHANNEL_MANAGER_ADDRESS =
  publicEnv.NEXT_PUBLIC_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE ||
  SUPPORTED_CHAINS[chain.id as keyof typeof SUPPORTED_CHAINS]
    .channelManagerAddress;
