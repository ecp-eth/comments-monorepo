import { env } from "@/env";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { JSONResponse } from "@ecp.eth/shared/helpers";
import { LRUCache } from "lru-cache";
import {
  createFarcasterByAddressResolver,
  createERC20ByAddressResolver,
  type ERC20ByAddressResolverKey,
  createENSByAddressResolver,
  createENSByNameResolver,
  // createERC20ByQueryResolver,
  type ResolvedFarcasterData,
  type ResolvedENSData,
  ResolvedERC20Data,
} from "@ecp.eth/shared/resolvers";
import { NextRequest } from "next/server";
import { type Hex } from "viem";
import { z } from "zod";
import { gql, request as graphqlRequest } from "graphql-request";

type Result = {
  domains: {
    id: Hex;
    name: string;
    resolvedAddress:
      | {
          id: Hex;
        }
      | undefined;
    owner: {
      id: Hex;
    };
  }[];
};

const searchByNameQuery = gql`
  query SearchByName($name: String!) {
    domains(
      where: { name_contains: $name, resolvedAddress_not: "" }
      first: 10
    ) {
      id
      name
      resolvedAddress {
        id
      }
      owner {
        id
      }
    }
  }
`;

const searchByAddressQuery = gql`
  query SearchByAddress($address: String!) {
    domains(where: { resolvedAddress_starts_with: $address }, first: 10) {
      id
      name
      resolvedAddress {
        id
      }
      owner {
        id
      }
    }
  }
`;

const VALID_ENS_NAME = /^[a-z0-9]+([-_][a-z0-9]+)*(\.[a-z]{2,})?$/;

async function searchEns(query: string): Promise<Result | null> {
  if (!env.GRAPH_API_KEY || !env.GRAPH_ENS_SUBGRAPH_URL) {
    return null;
  }

  if (query.startsWith("0x")) {
    const results = await graphqlRequest<Result>(
      env.GRAPH_ENS_SUBGRAPH_URL,
      searchByAddressQuery,
      {
        address: query,
      },
      {
        Authorization: `Bearer ${env.GRAPH_API_KEY}`,
      },
    );

    if (results.domains.length > 0) {
      return results;
    }

    return null;
  }

  if (!VALID_ENS_NAME.test(query)) {
    return null;
  }

  const results = await graphqlRequest<Result>(
    env.GRAPH_ENS_SUBGRAPH_URL,
    searchByNameQuery,
    {
      name: query,
    },
    {
      Authorization: `Bearer ${env.GRAPH_API_KEY}`,
    },
  );

  if (results.domains.length > 0) {
    return results;
  }

  return null;
}

const ERC_20_CAIP_19_REGEX = /^eip155:(\d+)\/erc20:(0x[a-fA-F0-9]{40})$/;

/* const allChains = Object.values(chains);

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
*/

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
  simApiKey: env.SIM_API_KEY,
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
  avatarUrl: z.string().nullable(),
  url: z.string(),
});

const erc20TokenSuggestionSchema = z.object({
  type: z.literal("erc20"),
  name: z.string(),
  symbol: z.string(),
  address: HexSchema,
  caip19: z.string(),
  chainId: z.number().int(),
  decimals: z.number().int(),
  logoURI: z.string().nullable(),
});

const farcasterSuggestionSchema = z.object({
  type: z.literal("farcaster"),
  address: HexSchema,
  fid: z.number().int(),
  fname: z.string(),
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
  const { query, char } = requestParamSchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (char === "@") {
    if (isEthAddress(query)) {
      const ensName = await ensByAddressResolver.load(query);

      if (ensName) {
        return new JSONResponse(responseSchema, {
          suggestions: [
            {
              type: "ens",
              name: ensName.name,
              address: ensName.address,
              url: ensName.url,
              avatarUrl: ensName.avatarUrl,
            },
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

      const token = await erc20ByAddressResolver.load(query);

      if (token) {
        return new JSONResponse(responseSchema, {
          suggestions: token.chains.map((chain) => ({
            type: "erc20",
            symbol: token.symbol,
            name: token.name,
            address: query,
            caip19: chain.caip,
            chainId: chain.chainId,
            decimals: token.decimals,
            logoURI: token.logoURI,
          })),
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
            {
              type: "ens",
              name: ensName.name,
              address: ensName.address,
              url: ensName.url,
              avatarUrl: ensName.avatarUrl,
            },
          ],
        });
      }
    }

    const results = await searchEns(query);

    if (results) {
      return new JSONResponse(responseSchema, {
        suggestions: results.domains.map((domain) => ({
          type: "ens" as const,
          name: domain.name,
          address: domain.resolvedAddress?.id ?? domain.owner.id,
          url: `https://app.ens.domains/${domain.resolvedAddress?.id ?? domain.owner.id}`,
          // @todo we need an avatar url here, subgraph somehow doesn't have it
          avatarUrl: null,
        })),
      });
    }
  }

  // detect if user entered caip19 address of ERC20 token
  const caip19Match = query.match(ERC_20_CAIP_19_REGEX);

  if (caip19Match) {
    const [, , address] = caip19Match;
    const token = await erc20ByAddressResolver.load(address as Hex);

    if (token) {
      return new JSONResponse(responseSchema, {
        suggestions: token.chains.map((chain) => ({
          type: "erc20",
          name: token.name,
          address: token.address,
          symbol: token.symbol,
          caip19: chain.caip,
          chainId: chain.chainId,
          decimals: token.decimals,
          logoURI: token.logoURI,
        })),
      });
    }
  }

  // for now we don't support erc20 mentions until we find some API to properly look for them
  return new JSONResponse(responseSchema, {
    suggestions: [],
  });

  // so we weren't able to resolve an address so now we don't care what the char actually is and we can just try to search for erc20 tokens
  /* const tokens = await erc20ByQueryResolver.load(query);

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
