import type { Hex } from "viem";

export type ResolvedENSData = {
  address: Hex;
  name: string;
  avatarUrl: string | null;
};

export type ResolvedFarcasterData = {
  fid: number;
  address: Hex;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
};

export type ResolvedERC20Data = {
  address: Hex;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
};
