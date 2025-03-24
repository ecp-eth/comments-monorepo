import type { Abi, Address } from "abitype";
import { erc20Abi } from "viem";
import { base } from "viem/chains";

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const AFFILIATE_FEE = 100; // 1% affiliate fee. Denoted in Bps.
export const FEE_RECIPIENT = "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d"; // The ETH address that should receive affiliate fees

export interface Token {
  name: string;
  address: Address;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI: string;
  abi: Abi;
}

const TOKENS = {
  weth: {
    chainId: base.id,
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    address: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
    logoURI:
      "https://raw.githubusercontent.com/maticnetwork/polygon-token-assets/main/assets/tokenAssets/weth.svg",
    abi: erc20Abi,
  } satisfies Token,
  usdc: {
    chainId: base.id,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    logoURI:
      "https://raw.githubusercontent.com/maticnetwork/polygon-token-assets/main/assets/tokenAssets/usdc.svg",
    abi: erc20Abi,
  } satisfies Token,
};

export const BASE_TOKENS: Token[] = [TOKENS.weth, TOKENS.usdc];

export const BASE_TOKENS_BY_SYMBOL: Record<string, Token> = {
  weth: TOKENS.weth,
  usdc: TOKENS.usdc,
};

export const BASE_TOKENS_BY_ADDRESS: Record<string, Token> = {
  [TOKENS.weth.address.toLowerCase()]: TOKENS.weth,
  [TOKENS.usdc.address.toLowerCase()]: TOKENS.usdc,
};
