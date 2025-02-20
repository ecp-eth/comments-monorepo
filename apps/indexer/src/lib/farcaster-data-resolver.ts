import {
  NeynarAPIClient,
  Configuration as NeynarConfiguration,
} from "@neynar/nodejs-sdk";
import {
  IndexerAPIFarcasterDataSchema,
  type IndexerAPIFarcasterDataSchemaType,
} from "@ecp.eth/sdk/schemas";
import { type Hex } from "viem";
import DataLoader from "dataloader";
import { LRUCache } from "lru-cache";

if (!process.env.NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is required");
}

const config = new NeynarConfiguration({
  apiKey: process.env.NEYNAR_API_KEY,
});

const neynarClient = new NeynarAPIClient(config);

export type ResolvedFarcasterData = {
  address: Hex;
  farcaster?: IndexerAPIFarcasterDataSchemaType;
};

// could also use redis
const cacheMap = new LRUCache<Hex, Promise<ResolvedFarcasterData>>({
  max: 10000,
  ttl: 14 * 24 * 60 * 60 * 1000, // 14 days
  allowStale: true,
});

export const farcasterDataResolver = new DataLoader<Hex, ResolvedFarcasterData>(
  async (addresses) => {
    if (!addresses.length) {
      return [];
    }

    try {
      const response = await neynarClient.fetchBulkUsersByEthOrSolAddress({
        addresses: addresses.slice(),
      });

      return addresses.map((address) => {
        const [user] = response[address] ?? [];
        const parseUserDataResult = IndexerAPIFarcasterDataSchema.safeParse({
          fid: user?.fid,
          username: user?.username,
          displayName: user?.display_name,
          pfpUrl: user?.pfp_url,
        });

        if (!parseUserDataResult.success) {
          return new Error("Invalid user data");
        }

        return {
          address,
          farcaster: parseUserDataResult.data,
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
  }
);
