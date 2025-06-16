import DataLoader from "dataloader";
import { type Address, getAddress, type Hex } from "viem";
import {
  NeynarAPIClient,
  Configuration as NeynarConfiguration,
  isApiErrorResponse,
} from "@neynar/nodejs-sdk";

import type { User } from "@neynar/nodejs-sdk/build/api";
import {
  IndexerAPIFarcasterDataSchema,
  type IndexerAPIFarcasterDataSchemaType,
} from "@ecp.eth/sdk/indexer";

export type ResolvedFarcasterData = {
  fid: number;
  fname: string;
  address: Hex;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  url: string;
};

export type FarcasterByAddressResolver = DataLoader<
  Hex,
  ResolvedFarcasterData | null
>;

export type FarcasterByAddressResolverOptions = {
  neynarApiKey: string;
  /**
   * By default it generates https://farcaster.xyz/username url
   */
  generateProfileUrl?: (user: IndexerAPIFarcasterDataSchemaType) => string;
} & Omit<
  DataLoader.Options<Hex, ResolvedFarcasterData | null>,
  "batchLoadFn" | "maxBatchSize"
>;

export function createFarcasterByAddressResolver({
  neynarApiKey,
  generateProfileUrl = (user) =>
    new URL(`https://farcaster.xyz/${user.username}`).toString(),
  ...dataLoaderOptions
}: FarcasterByAddressResolverOptions): FarcasterByAddressResolver {
  const neynarClient = new NeynarAPIClient(
    new NeynarConfiguration({
      apiKey: neynarApiKey,
    }),
  );

  return new DataLoader<Hex, ResolvedFarcasterData | null>(
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
            url: generateProfileUrl(parseUserDataResult.data),
            fname: `${parseUserDataResult.data.username}.fcast.id`,
            ...parseUserDataResult.data,
          };
        });
      } catch (e) {
        if (isApiErrorResponse(e) && e.response.status === 404) {
          // this is expected edge case in neynar api when you pass only one address and that address does not exist
          // in this case we return null for all addresses
          return addresses.map(() => null);
        }

        console.error(e);

        const err = e instanceof Error ? e : new Error(String(e));
        throw err;
      }
    },
    {
      ...dataLoaderOptions,
      maxBatchSize: 350, // this is limit coming from neynar api
    },
  );
}
