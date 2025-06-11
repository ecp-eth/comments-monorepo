import type { Hex } from "viem";

export type ResolvedENSData = {
  address: Hex;
  name: string;
  avatarUrl: string | null;
  url: string;
};

export type ResolvedERC20Data = {
  address: Hex;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
  url: string;
  caip19: string;
  chainId: number;
};
