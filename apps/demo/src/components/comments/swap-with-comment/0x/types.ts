import type { Abi, Address } from "abitype";

export interface Token {
  name: string;
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
  abi: Abi;
}
