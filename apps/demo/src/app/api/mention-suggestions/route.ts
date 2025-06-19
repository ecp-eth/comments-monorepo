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
  createFarcasterByNameResolver,
  // createERC20ByQueryResolver,
  type ResolvedFarcasterData,
  type ResolvedENSData,
  type ResolvedERC20Data,
  isFarcasterFname,
  FarcasterName,
} from "@ecp.eth/shared/resolvers";
import { NextRequest } from "next/server";
import { type Hex } from "viem";
import { z } from "zod";
import { gql, request as graphqlRequest } from "graphql-request";

type ENSResult = {
  domains: {
    id: Hex;
    name: string;
    resolvedAddress: {
      id: Hex;
    };
    resolver: {
      textChangeds: {
        key: "avatar" | string;
        value: string | null;
      }[];
    };
  }[];
};

const domainFragment = gql`
  fragment DomainFragment on Domain {
    id
    name
    resolvedAddress {
      id
    }
    resolver {
      textChangeds(
        where: { key: "avatar" }
        first: 1
        orderBy: blockNumber
        orderDirection: desc
      ) {
        key
        value
      }
    }
  }
`;

const searchByNameQuery = gql`
  ${domainFragment}
  query SearchByName($name: String!, $currentTimestamp: BigInt!) {
    domains(
      where: {
        name_contains: $name
        # make sure to exclude reverse records
        name_not_ends_with: ".addr.reverse"
        # make sure to exclude empty labels
        labelName_not: ""
        # make sure to exclude expired domains
        expiryDate_gte: $currentTimestamp
        resolvedAddress_not: ""
      }
      first: 20
    ) {
      ...DomainFragment
    }
  }
`;

const searchByAddressQuery = gql`
  ${domainFragment}
  query SearchByAddress($address: String!, $currentTimestamp: BigInt!) {
    domains(
      where: {
        resolvedAddressId_starts_with: $address
        expiryDate_gte: $currentTimestamp
        labelName_not: ""
      }
      first: 20
    ) {
      ...DomainFragment
    }
  }
`;

const ensResultSchema = z
  .object({
    domains: z.array(
      z.object({
        id: HexSchema,
        name: z.string(),
        resolvedAddress: z.object({
          id: HexSchema,
        }),
        resolver: z.object({
          textChangeds: z.array(
            z.object({
              key: z.string().or(z.literal("avatar")),
              value: z.string().nullable(),
            }),
          ),
        }),
      }),
    ),
  })
  .transform((val) => {
    return {
      domains: val.domains.map((domain) => {
        const avatarUrl = domain.resolver.textChangeds.find(
          (t) => t.key === "avatar" && !!t.value,
        )?.value;

        return {
          ...domain,
          avatarUrl: avatarUrl ? normalizeAvatarUrl(avatarUrl) : null,
        };
      }),
    };
  });

type ENSResultType = z.infer<typeof ensResultSchema>;

async function searchEns(query: string): Promise<ENSResultType | null> {
  if (!env.ENSNODE_SUBGRAPH_URL) {
    return null;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (query.startsWith("0x")) {
    const results = await graphqlRequest<ENSResult>(
      env.ENSNODE_SUBGRAPH_URL,
      searchByAddressQuery,
      {
        address: query,
        currentTimestamp,
      },
    );

    if (results.domains.length > 0) {
      return ensResultSchema.parse(results);
    }

    return null;
  }

  // do not allow a string that is completely non-alphanumeric or starts with non-alphanumeric
  if (/^[^a-zA-Z0-9]/.test(query) || /^[^a-zA-Z0-9]+$/.test(query)) {
    return null;
  }

  const results = await graphqlRequest<ENSResult>(
    env.ENSNODE_SUBGRAPH_URL,
    searchByNameQuery,
    {
      name: query,
      currentTimestamp,
    },
  );

  if (results.domains.length > 0) {
    return ensResultSchema.parse(results);
  }

  return null;
}

function normalizeAvatarUrl(url: string): string | null {
  if (URL.canParse(url)) {
    const { protocol } = new URL(url);

    if (protocol === "ipfs:") {
      return `https://ipfs.io/ipfs/${url.slice(7)}`;
    }

    if (protocol === "http:" || protocol === "https:") {
      return url;
    }
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

const farcasterByNameCache = new LRUCache<
  FarcasterName,
  Promise<ResolvedFarcasterData | null>
>({
  max: 1000,
  ttl: 1000 * 60 * 60 * 24,
});

const farcasterByNameResolver = createFarcasterByNameResolver({
  cacheMap: farcasterByNameCache,
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

function isEthName(name: string): name is `${string}.eth` {
  return name.match(/\.eth$/i) !== null;
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
    } else if (isEthName(query)) {
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
    } else if (isFarcasterFname(query)) {
      const farcaster = await farcasterByNameResolver.load(query);

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
    }

    const results = await searchEns(query);

    if (results) {
      return new JSONResponse(responseSchema, {
        suggestions: results.domains.map((domain) => ({
          type: "ens" as const,
          name: domain.name,
          address: domain.resolvedAddress.id,
          url: `https://app.ens.domains/${domain.resolvedAddress.id}`,
          avatarUrl: domain.avatarUrl ?? null,
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
