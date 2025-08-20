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

  return `eip155:${chainId}:erc721:${CHANNEL_MANAGER_ADDRESS}/${channelId}`;
}

export function getChannelNftImageUrl(
  channelId: bigint,
  chainId: number,
): string {
  return `https://nft.ethcomments.xyz/chain/${chainId}/${channelId}/image`;
}
