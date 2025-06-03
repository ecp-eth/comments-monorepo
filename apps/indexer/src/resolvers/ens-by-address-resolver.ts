import DataLoader from "dataloader";
import {
  createPublicClient,
  http,
  type PublicClient,
  type Hex,
  getAddress,
} from "viem";
import { mainnet } from "viem/chains";
import { env } from "../env";
import { LRUCache } from "lru-cache";
import { normalize } from "viem/ens";
import type { ResolvedENSData } from "./types";

export type ENSByAddressResolver = DataLoader<Hex, ResolvedENSData | null>;

async function resolveEnsData(
  client: PublicClient,
  address: Hex,
): Promise<ResolvedENSData | null> {
  const name = await client.getEnsName({ address });

  if (!name) {
    return null;
  }

  const normalizedName = normalize(name);

  const ensAddress = await client.getEnsAddress({ name: normalizedName });

  if (!ensAddress || getAddress(ensAddress) !== getAddress(address)) {
    return null;
  }

  const avatarUrl = await client.getEnsAvatar({ name: normalizedName });

  return {
    address: ensAddress,
    name: normalizedName,
    avatarUrl,
    url: `https://app.ens.domains/${ensAddress}`,
  };
}

function createENSByAddressResolver(): ENSByAddressResolver {
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

export const ensByAddressResolver = createENSByAddressResolver();
