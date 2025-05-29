import type { Hex } from "viem";

export type ResolvedAddress = {
  address: Hex;
  label: string;
};

export type EnsResolverService = {
  resolveAddress(address: Hex): Promise<ResolvedAddress | null>;
  resolveName(name: string): Promise<ResolvedAddress | null>;
};
