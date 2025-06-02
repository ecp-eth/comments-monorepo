import DataLoader from "dataloader";
import { createPublicClient, http, type Hex, type PublicClient } from "viem";
import type { ResolvedENSData } from "./types";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import { LRUCache } from "lru-cache";
import { env } from "../env";

export type ENSByNameResolver = DataLoader<string, ResolvedENSData | null>;

async function resolveEnsData(
  client: PublicClient,
  name: string,
): Promise<ResolvedENSData | null> {
  const normalizedName = normalize(name);
  const ensAddress = await client.getEnsAddress({ name: normalizedName });

  if (!ensAddress) {
    return null;
  }

  const avatarUrl = await client.getEnsAvatar({ name: normalizedName });

  return {
    address: ensAddress,
    name: normalizedName,
    avatarUrl,
  };
}

function createENSByAddressResolver(): ENSByNameResolver {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(env.ENS_RPC_URL),
  });

  // could also use redis
  const cacheMap = new LRUCache<Hex, Promise<ResolvedENSData | null>>({
    max: 10000,
    ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
    allowStale: true,
  });

  return new DataLoader<Hex, ResolvedENSData | null>(
    async (addresses) => {
      return Promise.all(
        addresses.map((address) => resolveEnsData(publicClient, address)),
      );
    },
    {
      cacheMap,
    },
  );
}

export const ensByNameResolver = createENSByAddressResolver();
