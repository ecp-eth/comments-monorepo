import type { Hex, PublicClient } from "viem";

export type ChainID = number;

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

export type ERC20ClientConfig = {
  client: PublicClient;
  tokenAddressURL: (address: Hex) => string;
};

export interface ERC20ClientRegistry {
  getClientByChainId(chainId: ChainID): Promise<ERC20ClientConfig | null>;
}
