import {
  createPublicClient,
  http,
  type PublicClient,
  type Hex,
  getAddress,
} from "viem";
import {
  IndexerAPIAuthorEnsDataSchema,
  type IndexerAPIAuthorEnsDataSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";
import DataLoader from "dataloader";
import { LRUCache } from "lru-cache";

export type ResolvedEnsData = {
  address: Hex;
  ens?: IndexerAPIAuthorEnsDataSchemaType;
};

async function resolveEnsData(
  client: PublicClient,
  address: Hex
): Promise<ResolvedEnsData> {
  const name = await client.getEnsName({ address });

  if (!name) {
    return {
      address,
    };
  }

  const normalizedName = normalize(name);

  const ensAddress = await client.getEnsAddress({ name: normalizedName });

  if (!ensAddress || getAddress(ensAddress) !== getAddress(address)) {
    return {
      address,
    };
  }

  const avatarUrl = await client.getEnsAvatar({ name: normalizedName });

  return {
    address,
    ens: IndexerAPIAuthorEnsDataSchema.parse({
      name: normalizedName,
      avatarUrl,
    }),
  };
}

function createEnsResolverLoader() {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  // could also use redis
  const cacheMap = new LRUCache<Hex, Promise<ResolvedEnsData>>({
    max: 10000,
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    allowStale: true,
  });

  return new DataLoader<Hex, ResolvedEnsData>(
    async (addresses) => {
      return Promise.all(
        addresses.map((address) => resolveEnsData(publicClient, address))
      );
    },
    {
      cacheMap,
    }
  );
}

export const ensDataResolver = createEnsResolverLoader();
