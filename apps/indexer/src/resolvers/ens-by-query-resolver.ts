import * as Sentry from "@sentry/node";
import DataLoader from "dataloader";
import type { ResolvedENSData } from "./ens.types";
import { gql, request as graphqlRequest } from "graphql-request";
import { z } from "zod";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core";

export type ENSByQueryResolverKey = string;
export type ENSByQueryResolver = DataLoader<
  ENSByQueryResolverKey,
  ResolvedENSData[] | null
>;

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

type ENSNodeResultType = z.infer<typeof ensResultSchema>;

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

async function searchEns(
  query: string,
  subgraphUrl: string,
): Promise<ResolvedENSData[] | null> {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (query.startsWith(".")) {
    return null;
  }

  let results: ENSNodeResult;

  if (query.startsWith("0x")) {
    results = await graphqlRequest<ENSNodeResult>(
      subgraphUrl,
      searchByAddressQuery,
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

      return Promise.all(queries.map((query) => searchEns(query, subgraphUrl)));
    },
    {
      maxBatchSize: 5,
      ...dataLoaderOptions,
    },
  );
}
