import type { Hex } from "@ecp.eth/sdk/core";

export type ResolvedFarcasterData = {
  fid: number;
  fname: string;
  address: Hex;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  url: string;
};

export type FarcasterName = `${string}.fcast.id`;
