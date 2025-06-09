import { erc20Abi } from "viem";
import { base } from "viem/chains";
import type { Token } from "./types";

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/**
 * Affiliate fee. Denoted in Bps.
 * @see https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getPrice
 */
export const SWAP_FEE_BPS = 0;
/**
 * The ETH address that should receive affiliate fees in selected buy token
 * @see https://0x.org/docs/api#tag/Swap/operation/swap::permit2::getPrice
 */
export const SWAP_FEE_RECIPIENT = "0x78397D9D185D3a57D01213CBe3Ec1EbAC3EEc77d";

const BASE_CHAIN_TOKENS = {
  weth: {
    chainId: base.id,
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    address: "0x4200000000000000000000000000000000000006",
    logoURI:
      "https://raw.githubusercontent.com/maticnetwork/polygon-token-assets/main/assets/tokenAssets/weth.svg",
    abi: erc20Abi,
  } satisfies Token,
  usdc: {
    chainId: base.id,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    logoURI:
      "https://raw.githubusercontent.com/maticnetwork/polygon-token-assets/main/assets/tokenAssets/usdc.svg",
    abi: erc20Abi,
  } satisfies Token,
};

// Organize tokens by chain ID
export const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  [base.id]: [BASE_CHAIN_TOKENS.weth, BASE_CHAIN_TOKENS.usdc],
};

export function getTokensByChain(chainId: number): Token[] {
  return TOKENS_BY_CHAIN[chainId] || [];
}

export function getTokenBySymbolAndChain(
  symbol: string,
  chainId: number,
): Token | undefined {
  const chainTokens = TOKENS_BY_CHAIN[chainId] || [];
  return chainTokens.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}

// For backward compatibility
export const BASE_TOKENS: Token[] = TOKENS_BY_CHAIN[base.id] || [];

export const BASE_TOKENS_BY_SYMBOL: Record<string, Token> = {
  weth: BASE_CHAIN_TOKENS.weth,
  usdc: BASE_CHAIN_TOKENS.usdc,
};

export const BASE_TOKENS_BY_ADDRESS: Record<string, Token> = {
  [BASE_CHAIN_TOKENS.weth.address.toLowerCase()]: BASE_CHAIN_TOKENS.weth,
  [BASE_CHAIN_TOKENS.usdc.address.toLowerCase()]: BASE_CHAIN_TOKENS.usdc,
};
