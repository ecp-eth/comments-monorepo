import DataLoader from "dataloader";
import { Address, getAddress, type Hex } from "viem";
import type { ResolvedFarcasterData } from "./types";
import { LRUCache } from "lru-cache";
import {
  NeynarAPIClient,
  Configuration as NeynarConfiguration,
} from "@neynar/nodejs-sdk";

import { User } from "@neynar/nodejs-sdk/build/api";
import { env } from "../env";
import { IndexerAPIFarcasterDataSchema } from "@ecp.eth/sdk/indexer";

export type FarcasterByAddressResolver = DataLoader<
  string,
  ResolvedFarcasterData | null
>;

const config = new NeynarConfiguration({
  apiKey: env.NEYNAR_API_KEY,
});

const neynarClient = new NeynarAPIClient(config);

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedFarcasterData | null>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterByAddressResolver = new DataLoader<
  Hex,
  ResolvedFarcasterData | null
>(
  async (addresses) => {
    if (!addresses.length) {
      return [];
    }

    try {
      const response = await neynarClient.fetchBulkUsersByEthOrSolAddress({
        addresses: addresses.slice(),
      });

      const normalizedResponse: Record<Address, User[]> = {};

      for (const [key, value] of Object.entries(response)) {
        normalizedResponse[getAddress(key)] = value;
      }

      return addresses.map((address) => {
        const normalizedAddress = getAddress(address);
        const [user] = normalizedResponse[normalizedAddress] ?? [];
        const parseUserDataResult = IndexerAPIFarcasterDataSchema.safeParse({
          fid: user?.fid,
          username: user?.username,
          displayName: user?.display_name,
          pfpUrl: user?.pfp_url,
        });

        if (!parseUserDataResult.success) {
          return null;
        }

        return {
          address: normalizedAddress,
          ...parseUserDataResult.data,
        };
      });
    } catch (e) {
      console.error(e);

      const err = e instanceof Error ? e : new Error(String(e));

      // return the error for all addresses because whole bulk load failed
      return addresses.map(() => err);
    }
  },
  {
    cacheMap,
    maxBatchSize: 350, // this is limit coming from neynar api
  },
);
