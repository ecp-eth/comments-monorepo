import DataLoader from "dataloader";
import { createPublicClient, http, type PublicClient } from "viem";
import type { ResolvedENSData } from "./ens.types";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

export type ENSByNameResolver = DataLoader<string, ResolvedENSData | null>;

export function isEthName(name: string): name is `${string}.eth` {
  return name.match(/.+\.eth$/i) !== null;
}

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
    url: `https://app.ens.domains/${ensAddress}`,
  };
}

export type ENSByNameResolverOptions = {
  chainRpcUrl: string;
} & DataLoader.Options<string, ResolvedENSData | null>;

export function createENSByNameResolver({
  chainRpcUrl,
  ...dataLoaderOptions
}: ENSByNameResolverOptions): ENSByNameResolver {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(chainRpcUrl),
  });

  return new DataLoader<string, ResolvedENSData | null>(async (addresses) => {
    return Promise.all(
      addresses.map((address) => resolveEnsData(publicClient, address)),
    );
  }, dataLoaderOptions);
}
