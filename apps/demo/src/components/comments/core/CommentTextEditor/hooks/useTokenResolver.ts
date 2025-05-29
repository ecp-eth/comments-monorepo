import { use, useMemo } from "react";
import type { Hex } from "viem";
import { isAddressEqual } from "viem";
import { z } from "zod";

const tokenList = import("./token-list.json");

export type Token = Awaited<typeof tokenList>["tokens"][number];

export type TokenResolverService = {
  /**
   * Resolves a token by its symbol
   *
   * @param symbol The token symbol
   * @returns The resolved token information or null if not found
   */
  resolveSymbol(symbol: string): Promise<Token | null>;

  /**
   * Resolves a token by its CAIP-19 address
   * @param caip19 The CAIP-19 address
   *
   * @returns The resolved token information or null if not found
   */
  resolverCaip19(caip19: string): Promise<Token | null>;

  /**
   * Searches for tokens by query string (e.g. symbol or name)
   * @param query The search query
   *
   * @returns Array of matching tokens
   */
  searchTokens(query: string): Promise<Token[]>;
};

type UseTokenResolverOptions = {
  chainId: number;
};

export function useTokenResolver({
  chainId,
}: UseTokenResolverOptions): TokenResolverService {
  const { tokens } = use(tokenList);

  const tokensByChainId = useMemo(
    () => tokens.filter((token) => token.chainId === chainId),
    [chainId, tokens],
  );

  return useMemo(
    () => ({
      resolveSymbol: async (symbol) => {
        return tokensByChainId.find((token) => token.symbol === symbol) ?? null;
      },
      resolverCaip19: async (caip19) => {
        const [chainId, address] = caip19.split(":");
        const chainIdNumber = z.coerce.number().int().parse(chainId);

        const token = tokens.find(
          (token) =>
            token.chainId === chainIdNumber &&
            isAddressEqual(token.address as Hex, address as Hex),
        );

        return token ?? null;
      },
      async searchTokens(query) {
        return tokensByChainId.filter((token) =>
          token.symbol.toLowerCase().includes(query.toLowerCase()),
        );
      },
    }),
    [tokensByChainId, tokens],
  );
}
