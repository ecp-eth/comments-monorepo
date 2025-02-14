import {
  createPublicClient,
  http,
  type PublicClient,
  type Hex,
  getAddress,
} from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";
import DataLoader from "dataloader";
import { LRUCache } from "lru-cache";

export type ResolvedName = {
  address: Hex;
  ens?: {
    name: string;
    avatarUrl: string | null;
  };
};

async function resolveEnsData(
  client: PublicClient,
  address: Hex
): Promise<ResolvedName> {
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
    ens: {
      name: normalizedName,
      avatarUrl,
    },
  };
}

function createEnsResolverLoader() {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  });

  // could also use redis
  const cacheMap = new LRUCache<Hex, Promise<ResolvedName>>({
    max: 10000,
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    allowStale: true,
  });

  return new DataLoader<Hex, ResolvedName>(
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
