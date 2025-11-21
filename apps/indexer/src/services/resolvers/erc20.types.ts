import type { Hex, PublicClient } from "viem";

export type ChainID = number;

export type ResolvedERC20Data = {
  address: Hex;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string | null;
  chains: {
    /**
     * CAIP-19 format
     */
    caip: string;
    chainId: ChainID;
  }[];
};

export type ERC20ClientConfig = {
  client: PublicClient;
  tokenAddressURL: (address: Hex) => string;
};

export interface ERC20ClientRegistry {
  getClientByChainId(chainId: ChainID): Promise<ERC20ClientConfig | null>;
}
