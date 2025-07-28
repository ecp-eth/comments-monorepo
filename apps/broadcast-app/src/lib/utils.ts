import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CHANNEL_MANAGER_ADDRESS } from "@ecp.eth/sdk";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getChannelCaipUri(params: {
  chainId: number;
  channelId: bigint;
}) {
  const { chainId, channelId } = params;

  return `eip155:${chainId}:erc-721:${CHANNEL_MANAGER_ADDRESS}/${channelId}`;
}
