import { env } from "@/env";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { tokenList } from "@ecp.eth/shared/token-list";
import { NextRequest } from "next/server";
import {
  createPublicClient,
  type Hex,
  http,
  getAddress,
  isAddressEqual,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { z } from "zod";
import { supportedChains } from "@/lib/wagmi";

const ensResolverClient = createPublicClient({
  chain: mainnet,
  transport: http(env.ENS_RPC_URL),
});

const requestParamSchema = z.object({
  query: z.string().trim().min(3).nonempty(),
  chainId: z
    .enum(Object.keys(supportedChains) as [string, ...string[]])
    .transform((value) => Number(value)),
});

const ensSuggestionSchema = z.object({
  type: z.literal("ens"),
  address: HexSchema,
  name: z.string(),
});

const erc20TokenSuggestionSchema = z.object({
  type: z.literal("erc20"),
  name: z.string(),
  symbol: z.string(),
  address: HexSchema,
});

const suggestionSchema = z.union([
  ensSuggestionSchema,
  erc20TokenSuggestionSchema,
]);

export type AddressSuggestionSchemaType = z.infer<typeof suggestionSchema>;

const responseSchema = z.object({
  suggestions: z.array(suggestionSchema),
});

export type AddressSuggestionsResponseSchemaType = z.infer<
  typeof responseSchema
>;

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Resolves possible mentions based on given query
 */
export async function GET(request: NextRequest) {
  const { query, chainId } = requestParamSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (ETH_ADDRESS_REGEX.test(query)) {
    // check if has ENS name
    const ensName = await ensResolverClient.getEnsName({
      address: query as Hex,
    });

    if (ensName) {
      return new JSONResponse(responseSchema, {
        suggestions: [
          { type: "ens", name: ensName, address: getAddress(query) },
        ],
      });
    }

    // there is no ens name, check if the token is ERC20 token on current chain (known token)
    // if token is not known, try to resolve it from the chain
    const token = tokenList.find(
      (token) =>
        isAddressEqual(token.address as Hex, query as Hex) &&
        token.chainId === chainId,
    );

    if (token) {
      return new JSONResponse(responseSchema, {
        suggestions: [
          {
            type: "erc20",
            name: token.symbol,
            address: getAddress(token.address),
            symbol: token.symbol,
          },
        ],
      });
    }

    const resolvedToken = await resolveERC20Token(query as Hex, chainId);

    if (resolvedToken) {
      return new JSONResponse(responseSchema, {
        suggestions: [
          {
            type: "erc20",
            name: resolvedToken.name,
            address: resolvedToken.address,
            symbol: resolvedToken.symbol,
          },
        ],
      });
    }

    return new JSONResponse(responseSchema, {
      suggestions: [],
    });
  }

  if (query.endsWith(".eth")) {
    const resolved = await ensResolverClient.getEnsAddress({
      name: normalize(query),
    });

    if (resolved) {
      return new JSONResponse(responseSchema, {
        suggestions: [{ type: "ens", name: query, address: resolved }],
      });
    }
  }

  const lowerCaseQuery = query.toLowerCase();
  // just try to check if it's a ticker for a token on the chain
  const tokens = tokenList.filter(
    (token) =>
      token.symbol.toLowerCase().includes(lowerCaseQuery) &&
      token.chainId === chainId,
  );

  return new JSONResponse(responseSchema, {
    suggestions: tokens.map((token) => ({
      type: "erc20" as const,
      name: token.name,
      address: getAddress(token.address),
      symbol: token.symbol,
    })),
  });
}

const ERC20_ABI = [
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

type ERC20Token = {
  address: Hex;
  name: string;
  symbol: string;
  decimals: number;
};

async function resolveERC20Token(
  address: Hex,
  chainId: number,
): Promise<null | ERC20Token> {
  const chainConfig = supportedChains[chainId as keyof typeof supportedChains];

  if (!chainConfig) {
    throw new Error(`Chain ${chainId} is not supported`);
  }

  const publicClient = createPublicClient(chainConfig);
  const bytecode = await publicClient.getCode({ address });

  if (!bytecode) {
    return null;
  }

  try {
    const name = await publicClient.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "name",
    });

    const symbol = await publicClient.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "symbol",
    });

    const decimals = await publicClient.readContract({
      address,
      abi: ERC20_ABI,
      functionName: "decimals",
    });

    return { address: getAddress(address), name, symbol, decimals };
  } catch (e) {
    console.warn("Resolving ERC20 token from chain failed with", e);
    return null;
  }
}
