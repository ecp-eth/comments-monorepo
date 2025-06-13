import type { Hex } from "viem";

export type ResolvedENSData = {
  address: Hex;
  name: string;
  avatarUrl: string | null;
  url: string;
};
