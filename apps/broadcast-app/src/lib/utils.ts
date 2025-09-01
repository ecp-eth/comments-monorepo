import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CHANNEL_MANAGER_ADDRESS } from "@ecp.eth/sdk";
import { AssetId } from "caip";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getChannelCaipUri(params: {
  chainId: number;
  channelId: bigint;
}) {
  const { chainId, channelId } = params;

  return AssetId.format({
    chainId: {
      namespace: "eip155",
      reference: chainId.toString(),
    },
    assetName: {
      namespace: "erc721",
      reference: CHANNEL_MANAGER_ADDRESS,
    },
    tokenId: channelId.toString(),
  });
}

export function getChannelNftImageUrl(
  channelId: bigint,
  chainId: number,
): string {
  return `https://nft.ethcomments.xyz/chain/${chainId}/${channelId}/image`;
}
