import type { Hex } from "viem";
import {
  NeynarAPIClient,
  Configuration as NeynarConfiguration,
  isApiErrorResponse,
} from "@neynar/nodejs-sdk";

import { type IndexerAPIFarcasterDataSchemaType } from "@ecp.eth/sdk/indexer";
import type {
  FarcasterName,
  ResolvedFarcasterData,
} from "./farcaster.types.ts";
import { constructFname, extractFarcasterName } from "./farcaster.utils.ts";
import { DataLoader, type DataLoaderOptions } from "../services/dataloader.ts";

export type FarcasterByNameKey = string | FarcasterName;

export type FarcasterByNameResolver = DataLoader<
  FarcasterByNameKey,
  ResolvedFarcasterData | null
>;

export type FarcasterByNameResolverOptions = {
  neynarApiKey: string;
  /**
   * By default it generates https://farcaster.xyz/username url
   */
  generateProfileUrl?: (user: IndexerAPIFarcasterDataSchemaType) => string;
} & Omit<
  DataLoaderOptions<FarcasterByNameKey, ResolvedFarcasterData | null>,
  "batchLoadFn" | "maxBatchSize" | "name"
>;

export function createFarcasterByNameResolver({
  neynarApiKey,
  generateProfileUrl = (user) =>
    new URL(`https://farcaster.xyz/${user.username}`).toString(),
  ...dataLoaderOptions
}: FarcasterByNameResolverOptions): FarcasterByNameResolver {
  const neynarClient = new NeynarAPIClient(
    new NeynarConfiguration({
      apiKey: neynarApiKey,
    }),
  );

  return new DataLoader<FarcasterByNameKey, ResolvedFarcasterData | null>(
    async (names) => {
      if (!names.length) {
        return [];
      }

      return Promise.all(
        names.map(async (name) => {
          try {
            const { user } = await neynarClient.lookupUserByUsername({
              username: extractFarcasterName(name),
            });

            return {
              fid: user.fid,
              url: generateProfileUrl(user),
              username: user.username,
              address: user.custody_address as Hex,
              fname: constructFname(user.username),
              displayName: user.display_name,
              pfpUrl: user.pfp_url,
            };
          } catch (e) {
            if (isApiErrorResponse(e) && e.response.status === 404) {
              return null;
            }

            console.error(e);

            const err = e instanceof Error ? e : new Error(String(e));

            throw err;
          }
        }),
      );
    },
    {
      ...dataLoaderOptions,
      maxBatchSize: 1,
      name: "FarcasterByNameResolver",
    },
  );
}
