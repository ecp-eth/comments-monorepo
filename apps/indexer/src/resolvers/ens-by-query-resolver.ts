import * as Sentry from "@sentry/node";
import { z } from "zod";
import DataLoader from "dataloader";
import DeferredCtor, { type Deferred } from "promise-deferred";
import { gql, request as graphqlRequest } from "graphql-request";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core";
import type { ResolvedENSData } from "./ens.types.ts";

const FULL_WALLET_ADDRESS_LENGTH = 42;
const MAX_DOMAIN_PER_ADDRESS = 30;
const MAX_BATCH_SIZE = 5;

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
              {
                level: "warning",
                extra: {
                  error,
                },
              },
            );
          });
      }

      return Promise.all(promises);
    },
    {
      maxBatchSize: MAX_BATCH_SIZE,
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

const ensResultDomainsSchema = z
  .array(
    z.object({
      id: HexSchema,
      name: z.string(),
      expiryDate: z.coerce.number().nullable(),
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
  )
  .transform((val) => {
    return val.map((domain) => {
      const avatarUrl = domain.resolver.textChangeds.find(
        (t) => t.key === "avatar" && !!t.value,
      )?.value;

      return {
        ...domain,
        avatarUrl: avatarUrl ? normalizeAvatarUrl(avatarUrl) : null,
      };
    });
  });

const ensResultByExactAddressSchema = z.record(
  z.string(),
  ensResultDomainsSchema,
);

const ensResultSchema = z.object({
  domains: ensResultDomainsSchema,
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
    expiryDate
  }
`;

const searchByNameQuery = gql`
  ${domainFragment}
  query SearchByName($name: String!) {
    domains(
      where: {
        name_contains: $name
        # make sure to exclude reverse records
        name_not_ends_with: ".addr.reverse"
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
  query SearchByAddress($address: String!) {
    domains(where: { resolvedAddressId_starts_with: $address }, first: 20) {
      ...DomainFragment
    }
  }
`;

const searchByExactAddressQueryTemplate = `
  domains(where: { resolvedAddressId_in: $addresses }, first: $count) {
    ...DomainFragment
  }
`;

const searchByExactAddressQueryContainerTemplate = `
  ${domainFragment}
  query SearchByExactAddress($addresses: [String!]!, $count: Int!) {
    <<RECORDS>>
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
      },
    );
  } else {
    results = await graphqlRequest<ENSNodeResult>(
      subgraphUrl,
      searchByNameQuery,
      {
        name: query,
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

  return parsedResults.data.domains
    .filter((domain) => {
      // what we found out is that some domains returned from ensnode do not have expiry, but they are actually not expired
      // one of the example is test.normx.eth
      // so we need to filter them out manually rather than using expiryDate_gte
      if (domain.expiryDate && domain.expiryDate < currentTimestamp) {
        return false;
      }

      return true;
    })
    .map((domain) => ({
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

  const query = searchByExactAddressQueryContainerTemplate.replace(
    "<<RECORDS>>",
    addresses
      .map(
        (address) => address.slice(2) + ":" + searchByExactAddressQueryTemplate,
      )
      .join("\n"),
  );

  const results = await graphqlRequest<ENSNodeResult>(subgraphUrl, query, {
    addresses: addresses,
    count: addresses.length * MAX_DOMAIN_PER_ADDRESS,
  });

  const parsedResults = ensResultByExactAddressSchema.safeParse(results);

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

  const resolvedEnsDataMap = new Map<Hex, ResolvedENSData[]>();

  addresses.forEach((address) => {
    const domains = parsedResults.data[address.slice(2)];
    if (!domains || domains.length === 0) {
      return;
    }

    domains.forEach((domain) => {
      if (domain.expiryDate && domain.expiryDate < currentTimestamp) {
        return;
      }

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
  });

  return addresses.map(
    (address) => resolvedEnsDataMap.get(address.toLowerCase() as Hex) ?? [],
  );
}
