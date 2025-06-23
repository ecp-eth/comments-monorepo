import { env } from "@/env";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { getChainById, JSONResponse } from "@ecp.eth/shared/helpers";
import { LRUCache } from "lru-cache";
import * as chains from "viem/chains";
import Dataloader from "dataloader";
import {
  createFarcasterByAddressResolver,
  createERC20ByAddressResolver,
  type ERC20ByAddressResolverKey,
  type ERC20ClientRegistry as ERC20ClientRegistryType,
  createENSByAddressResolver,
  createENSByNameResolver,
  // createERC20ByQueryResolver,
  type ResolvedFarcasterData,
  type ResolvedENSData,
  ResolvedERC20Data,
  type ERC20ClientConfig,
} from "@ecp.eth/shared/resolvers";
import { NextRequest } from "next/server";
import { type Hex, createPublicClient, http } from "viem";
import { z } from "zod";

// const ERC_20_CAIP_19_REGEX = /^eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})$/;

const allChains = Object.values(chains);

class ERC20ClientRegistry
  extends Dataloader<number, ERC20ClientConfig | null>
  implements ERC20ClientRegistryType
{
  constructor() {
    super(async (chainIds) => {
      return chainIds.map((chainId) => {
        try {
          const rpcUrl = z
            .string()
            .url()
            .parse(process.env[`ERC20_RPC_URL_${chainId}`]);
          const tokenUrl = z
            .string()
            .url()
            .parse(process.env[`ERC20_TOKEN_URL_${chainId}`]);

          return {
            client: createPublicClient({
              chain: getChainById(chainId, allChains) as chains.Chain,
              transport: http(rpcUrl),
            }),
            tokenAddressURL: (address) =>
              tokenUrl.replace("{tokenAddress}", address),
          } satisfies ERC20ClientConfig;
        } catch (e) {
          if (e instanceof z.ZodError) {
            console.error(
              `validation error for chain ${chainId} client`,
              e.flatten(),
            );
            return null;
          }

          throw e;
        }
      });
    });
  }

  getClientByChainId(chainId: number): Promise<ERC20ClientConfig | null> {
    return this.load(chainId);
  }
}

const erc20ClientRegistry = new ERC20ClientRegistry();

const farcasterByAddressCache = new LRUCache<
  Hex,
  Promise<ResolvedFarcasterData | null>
>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24,
});

const farcasterByAddressResolver = createFarcasterByAddressResolver({
  cacheMap: farcasterByAddressCache,
  neynarApiKey: env.NEYNAR_API_KEY,
});

const ensByAddressCache = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24,
});

const ensByAddressResolver = createENSByAddressResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap: ensByAddressCache,
});

const ensByNameCache = new LRUCache<string, Promise<ResolvedENSData | null>>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24,
});

const ensByNameResolver = createENSByNameResolver({
  chainRpcUrl: env.ENS_RPC_URL,
  cacheMap: ensByNameCache,
});

const erc20ByAddressCache = new LRUCache<
  ERC20ByAddressResolverKey,
  Promise<ResolvedERC20Data | null>
>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24,
});

const erc20ByAddressResolver = createERC20ByAddressResolver({
  clientRegistry: erc20ClientRegistry,
  cacheMap: erc20ByAddressCache,
});

/* const erc20ByQueryResolver = createERC20ByQueryResolver({
  limit: 20,
  clientRegistry: erc20ClientRegistry,
});*/

const requestParamSchema = z.object({
  query: z.string().trim().min(1).nonempty().toLowerCase(),
  chainId: z.coerce.number().int(),
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
  caip19: z.string(),
  chainId: z.number().int(),
});

const farcasterSuggestionSchema = z.object({
  type: z.literal("farcaster"),
  address: HexSchema,
  fid: z.number().int(),
  displayName: z.string().nullish(),
  username: z.string(),
  pfpUrl: z.string().nullish(),
  url: z.string(),
});

const suggestionSchema = z.union([
  ensSuggestionSchema,
  erc20TokenSuggestionSchema,
  farcasterSuggestionSchema,
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
      const ensName = await ensByAddressResolver.load(query);

      if (ensName) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            { type: "ens", name: ensName.name, address: ensName.address },
          ],
        });
      }

      const farcaster = await farcasterByAddressResolver.load(query);

      if (farcaster) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            {
              type: "farcaster",
              ...farcaster,
            },
          ],
        });
      }

      const token = await erc20ByAddressResolver.load([query, chainId]);

      if (token) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            {
              type: "erc20",
              symbol: token.symbol,
              name: token.name,
              address: query,
              caip19: token.caip19,
              chainId,
            },
          ],
        });
      }

      return new JSONResponse(responseSchema, {
        suggestions: [],
      });
    } else if (query.endsWith(".eth")) {
      const ensName = await ensByNameResolver.load(query);

      if (ensName) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            { type: "ens", name: ensName.name, address: ensName.address },
          ],
        });
      }
    }
  }

  return new JSONResponse(responseSchema, {
    suggestions: [],
  });

  // for now we don't support erc20 mentions until we find some API to properly look for them

  // detect if user entered caip19 address of ERC20 token
  /* const caip19Match = query.match(ERC_20_CAIP_19_REGEX);

  if (caip19Match) {
    const [, chainId, address] = caip19Match;
    const token = await erc20ByAddressResolver.load([
      address as Hex,
      Number(chainId),
    ]);

    if (token) {
      return new JSONResponse(responseSchema, {
        suggestions: [
          {
            type: "erc20",
            name: token.name,
            address: token.address,
            symbol: token.symbol,
            caip19: token.caip19,
            chainId: token.chainId,
          },
        ],
      });
    }
  }

  // so we weren't able to resolve an address so now we don't care what the char actually is and we can just try to search for erc20 tokens
  const tokens = await erc20ByQueryResolver.load(query);

  return new JSONResponse(responseSchema, {
    suggestions: tokens.map((token) => ({
      type: "erc20" as const,
      name: token.name,
      address: getAddress(token.address),
      symbol: token.symbol,
      caip19: token.caip19,
      chainId: token.chainId,
    })),
  });*/
}
