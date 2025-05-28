import type { Hex } from "viem";

export type EnsResolverService = {
  resolveAddress(address: Hex): Promise<{ address: Hex; label: string } | null>;
  resolveName(name: string): Promise<{ address: Hex; label: string } | null>;
};
