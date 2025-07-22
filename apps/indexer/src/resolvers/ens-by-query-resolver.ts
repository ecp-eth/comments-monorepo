import * as Sentry from "@sentry/node";
import { z } from "zod";
import DataLoader from "dataloader";
import DeferredCtor, { Deferred } from "promise-deferred";
import { gql, request as graphqlRequest } from "graphql-request";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core";
import type { ResolvedENSData } from "./ens.types";

const FULL_WALLET_ADDRESS_LENGTH = 42;

export type ENSByQueryResolverKey = string;
export type ENSByQueryResolver = DataLoader<
  ENSByQueryResolverKey,
  ResolvedENSData[] | null
>;

export type ENSByQueryResolverOptions = {
  /**
   * If not provided, the resolver will return null for all queries
   */
  subgraphUrl: string | null | undefined;
} & DataLoader.Options<ENSByQueryResolverKey, ResolvedENSData[] | null>;

/**
 * Creates a resolver that uses ENSNode.io subgraph to resolve ENS data
 */
export function createENSByQueryResolver({
  subgraphUrl,
  ...dataLoaderOptions
}: ENSByQueryResolverOptions): ENSByQueryResolver {
  return new DataLoader(
    async (queries) => {
      if (!subgraphUrl) {
        return queries.map(() => null);
      }

      const fullAddresses: Hex[] = [];
      const fullAddressesDeferred: Deferred<ResolvedENSData[] | null>[] = [];

      const promises = queries.map((query) => {
        if (isFullAddress(query)) {
          const deferred = new DeferredCtor<ResolvedENSData[]>();

          fullAddresses.push(query);
          fullAddressesDeferred.push(deferred);

          return deferred.promise;
        }

        return searchEns(query, subgraphUrl);
      });

      if (fullAddresses.length > 0) {
        searchEnsByExactAddressInBatch(fullAddresses, subgraphUrl)
          .then((results) => {
            if (results === null) {
              fullAddressesDeferred.forEach((deferred) => {
                deferred.resolve(null);
              });
              return;
            }

            fullAddressesDeferred.forEach((deferred, index) => {
              deferred.resolve(results[index] ?? null);
            });
          })
          .catch((error) => {
            // Resolve all deferred promises with null on error
            fullAddressesDeferred.forEach((deferred) => {
              deferred.resolve(null);
            });

            Sentry.captureMessage(
              "failed to batch query ENS with full addresses",
              error,
            );
          });
      }

      return Promise.all(promises);
    },
    {
      maxBatchSize: 5,
      ...dataLoaderOptions,
    },
  );
}

function isFullAddress(query: string): query is Hex {
  return query.startsWith("0x") && query.length === FULL_WALLET_ADDRESS_LENGTH;
}

function normalizeAvatarUrl(url: string): string | null {
  if (URL.canParse(url)) {
    const { protocol } = new URL(url);

    if (protocol === "ipfs:") {
      return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`;
    }

    if (protocol === "http:" || protocol === "https:") {
      return url;
    }
  }

  return null;
}

type ENSNodeResult = {
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

const searchByAddressStartsWithQuery = gql`
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

const searchByExactAddressInBatchQuery = gql`
  ${domainFragment}
  query SearchByAddress($addresses: [String!]!, $currentTimestamp: BigInt!) {
    domains(
      where: {
        resolvedAddressId_in: $addresses
        expiryDate_gte: $currentTimestamp
        labelName_not: ""
      }
      first: 20
    ) {
      ...DomainFragment
    }
  }
`;

async function searchEns(
  query: string,
  subgraphUrl: string,
): Promise<ResolvedENSData[] | null> {
  if (query.startsWith(".")) {
    return null;
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  let results: ENSNodeResult;

  if (query.startsWith("0x")) {
    results = await graphqlRequest<ENSNodeResult>(
      subgraphUrl,
      searchByAddressStartsWithQuery,
      {
        address: query,
        currentTimestamp,
      },
    );
  } else {
    results = await graphqlRequest<ENSNodeResult>(
      subgraphUrl,
      searchByNameQuery,
      {
        name: query,
        currentTimestamp,
      },
    );
  }

  const parsedResults = ensResultSchema.safeParse(results);

  if (!parsedResults.success) {
    Sentry.captureMessage("ENSNode subgraph returned invalid data", {
      level: "warning",
      extra: {
        query,
        results,
        error: parsedResults.error.flatten(),
      },
    });
    return null;
  }

  if (parsedResults.data.domains.length === 0) {
    return null;
  }

  return parsedResults.data.domains.map((domain) => ({
    address: domain.resolvedAddress.id,
    name: domain.name,
    avatarUrl: domain.avatarUrl,
    url: `https://app.ens.domains/${domain.resolvedAddress.id}`,
  }));
}

async function searchEnsByExactAddressInBatch(
  addresses: Hex[],
  subgraphUrl: string,
): Promise<ResolvedENSData[][] | null> {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const results = await graphqlRequest<ENSNodeResult>(
    subgraphUrl,
    searchByExactAddressInBatchQuery,
    {
      addresses,
      currentTimestamp,
    },
  );

  const parsedResults = ensResultSchema.safeParse(results);

  if (!parsedResults.success) {
    Sentry.captureMessage("ENSNode subgraph returned invalid data", {
      level: "warning",
      extra: {
        addresses,
        results,
        error: parsedResults.error.flatten(),
      },
    });
    return null;
  }

  if (parsedResults.data.domains.length === 0) {
    return null;
  }

  const resolvedEnsDataMap = new Map<Hex, ResolvedENSData[]>();

  parsedResults.data.domains.forEach((domain) => {
    const address: Hex = domain.resolvedAddress.id.toLowerCase() as Hex;
    const existing = resolvedEnsDataMap.get(address) ?? [];

    existing.push({
      address,
      name: domain.name,
      avatarUrl: domain.avatarUrl,
      url: `https://app.ens.domains/${address}`,
    });

    resolvedEnsDataMap.set(address, existing);
  });

  return addresses.map(
    (address) => resolvedEnsDataMap.get(address.toLowerCase() as Hex) ?? [],
  );
}
