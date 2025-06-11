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
  query: z.string().trim().min(1).nonempty().toLowerCase(),
  chainId: z
    .enum(Object.keys(supportedChains) as [string, ...string[]])
    .transform((value) => Number(value)),
  char: z.enum(["@", "$"]),
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

export type MentionSuggestionSchemaType = z.infer<typeof suggestionSchema>;

const responseSchema = z.object({
  suggestions: z.array(suggestionSchema),
});

export type MentionSuggestionsResponseSchemaType = z.infer<
  typeof responseSchema
>;

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isEthAddress(address: string): address is Hex {
  return ETH_ADDRESS_REGEX.test(address);
}

/**
 * Resolves possible mentions based on given query
 */
export async function GET(
  request: NextRequest,
): Promise<JSONResponse<typeof responseSchema>> {
  const { query, chainId, char } = requestParamSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (char === "@") {
    if (isEthAddress(query)) {
      const ensName = await resolveENSNameByAddress(query as Hex);

      if (ensName) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            { type: "ens", name: ensName, address: getAddress(query) },
          ],
        });
      }

      // @todo resolve farcaster
      const token = await suggestERC20TokenByAddress(query as Hex, chainId);

      if (token) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            {
              type: "erc20",
              symbol: token.symbol,
              name: token.name,
              address: query,
            },
          ],
        });
      }

      return new JSONResponse(responseSchema, {
        suggestions: [],
      });
    } else if (query.endsWith(".eth")) {
      const ensName = await resolveENSAddressByName(query);

      if (ensName) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            { type: "ens", name: ensName.name, address: ensName.address },
          ],
        });
      }
    }
  }

  // so we weren't able to resolve an address so now we don't care what the char actually is and we can just try to search for erc20 tokens
  const tokens = await suggestERC20TokensBySymbol(query, chainId);

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

async function resolveENSNameByAddress(address: Hex) {
  const ensName = await ensResolverClient.getEnsName({
    address,
  });

  return ensName;
}

async function resolveENSAddressByName(name: string) {
  const normalizedName = normalize(name);
  const address = await ensResolverClient.getEnsAddress({
    name: normalizedName,
  });

  if (address) {
    return {
      address,
      name: normalizedName,
    };
  }

  return null;
}

async function suggestERC20TokenByAddress(
  address: Hex,
  chainId: number,
): Promise<null | {
  name: string;
  symbol: string;
  logoURI?: string | null;
}> {
  let token:
    | {
        name: string;
        symbol: string;
        logoURI?: string | null;
      }
    | undefined
    | null = tokenList.find(
    (token) =>
      isAddressEqual(token.address as Hex, address) &&
      token.chainId === chainId,
  );

  if (!token) {
    token = await resolveERC20Token(address, chainId);
  }

  return token ?? null;
}

async function suggestERC20TokensBySymbol(
  lowerCasedSymbol: string,
  chainId: number,
) {
  const tokens = tokenList.filter(
    (token) =>
      token.symbol.toLowerCase().includes(lowerCasedSymbol) &&
      token.chainId === chainId,
  );

  return tokens;
}
