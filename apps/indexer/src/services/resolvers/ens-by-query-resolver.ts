import * as Sentry from "@sentry/node";
import { z } from "zod";
import DeferredCtor, { type Deferred } from "promise-deferred";
import { gql, request as graphqlRequest } from "graphql-request";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core";
import type { ResolvedENSData } from "./ens.types";
import { DataLoader, type DataLoaderOptions } from "../dataloader";
import { never } from "@ecp.eth/shared/helpers";

const FULL_WALLET_ADDRESS_LENGTH = 42;
const MAX_DOMAIN_PER_ADDRESS = 30;
const MAX_BATCH_SIZE = 5;

export type ENSByQueryResolverKey = string;

export type ENSByQueryResolverOptions = {
  /**
   * If not provided, the resolver will return null for all queries
   */
  subgraphUrl: string | null | undefined;
} & Omit<
  DataLoaderOptions<ENSByQueryResolverKey, ResolvedENSData[] | null>,
  "name"
>;

export class ENSByQueryResolver extends DataLoader<
  ENSByQueryResolverKey,
  ResolvedENSData[] | null
> {
  constructor({
    subgraphUrl,
    ...dataLoaderOptions
  }: ENSByQueryResolverOptions) {
    super(
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
        name: "ENSByQueryResolver",
        ...dataLoaderOptions,
      },
    );
  }
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
    } | null;
    resolver: {
      textChangeds: {
        key: "avatar" | string;
        value: string | null;
      }[];
    } | null;
  }[];
};

const ensResultDomainsSchema = z
  .array(
    z.object({
      id: HexSchema,
      name: z.string(),
      expiryDate: z.coerce.number().nullable(),
      resolvedAddress: z
        .object({
          id: HexSchema,
        })
        .nullable(),
      resolver: z
        .object({
          textChangeds: z.array(
            z.object({
              key: z.string().or(z.literal("avatar")),
              value: z.string().nullable(),
            }),
          ),
        })
        .nullable(),
    }),
  )
  .transform((val) => {
    return val.map((domain) => {
      const avatarUrl = domain.resolver?.textChangeds.find(
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
  query SearchByName($name: String!, $expiryDateGte: BigInt!) {
    domains(
      where: {
        # The query at the time of writing is only used when user typing a @query
        # in the input box to search for candidate of mention
        # using starts with will make the search more relevant
        name_starts_with: $name
        # comment out for now as it slows down the search (not always, but often)
        # resolvedAddress_not: ""
        # make sure to exclude reverse records and test records
        and: [
          { name_not_ends_with: ".addr.reverse" }
          { name_not_ends_with: "].eth" }
          { name_not_starts_with: "test.[" }
        ]
        or: [
          { expiryDate_gte: $expiryDateGte }
          {
            # some sub domains even they are active they don't have an expiry date from ensnode
            expiryDate: null
          }
        ]
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
        expiryDateGte: currentTimestamp.toString(),
      },
    );
  }

  const parsedResults = ensResultSchema.safeParse(results);

  if (!parsedResults.success) {
    console.error(
      "ENSNode subgraph returned invalid data",
      JSON.stringify(parsedResults.error.flatten(), null, 2),
    );
    Sentry.captureMessage("ENSNode subgraph returned invalid data", {
      level: "warning",
      extra: {
        query,
        results,
        error: JSON.stringify(parsedResults.error.flatten()),
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

      if (!domain.resolvedAddress) {
        return false;
      }

      return true;
    })
    .map((domain) => {
      const address = (domain.resolvedAddress?.id ??
        never(
          "null should be filtered out already, should never reach here",
        )) as Hex;
      return {
        address,
        name: domain.name,
        avatarUrl: domain.avatarUrl,
        url: `https://app.ens.domains/${address}`,
      };
    });
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
    console.error(
      "ENSNode subgraph returned invalid data",
      JSON.stringify(parsedResults.error.flatten(), null, 2),
    );
    Sentry.captureMessage("ENSNode subgraph returned invalid data", {
      level: "warning",
      extra: {
        addresses,
        results,
        error: JSON.stringify(parsedResults.error.flatten()),
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

    domains
      .filter((domain) => !!domain.resolvedAddress)
      .forEach((domain) => {
        if (domain.expiryDate && domain.expiryDate < currentTimestamp) {
          return;
        }

        const address: Hex = (domain.resolvedAddress?.id.toLowerCase() ??
          never(
            "null should be filtered out already, should never reach here",
          )) as Hex;
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
