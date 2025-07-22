import DataLoader from "dataloader";
import { createPublicClient, http, type PublicClient, type Hex } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import type { ResolvedENSData } from "./ens.types";
import type { ENSByQueryResolver } from "./ens-by-query-resolver";

export type ENSByAddressResolver = DataLoader<Hex, ResolvedENSData | null>;

async function resolveEnsData(
  client: PublicClient,
  address: Hex,
  ensByQueryResolver: ENSByQueryResolver,
): Promise<ResolvedENSData | null> {
  // `client.getEnsName` is a reverse lookup, it doesn't return ens names supported by custom resolvers,
  // such as .base.eth or .uni.eth, so try subgraph first as it covers all edge cases and support bundling
  // it will be faster.
  const results = await ensByQueryResolver.load(address);

  if (results && results.length > 0 && results[0]) {
    const result = results[0];

    return {
      address: result.address,
      avatarUrl: result.avatarUrl,
      name: result.name,
      url: result.url,
    };
  }

  const name = await client.getEnsName({ address });

  if (!name) {
    return null;
  }

  const normalizedName = normalize(name);

  const avatarUrl = await client.getEnsAvatar({ name: normalizedName });

  return {
    address,
    name: normalizedName,
    avatarUrl,
    url: `https://app.ens.domains/${address}`,
  };
}

export type ENSByAddressResolverOptions = {
  chainRpcUrl: string;
  ensByQueryResolver: ENSByQueryResolver;
} & DataLoader.Options<Hex, ResolvedENSData | null>;

export function createENSByAddressResolver({
  chainRpcUrl,
  ensByQueryResolver,
  ...dataLoaderOptions
}: ENSByAddressResolverOptions): ENSByAddressResolver {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(chainRpcUrl),
  });

  return new DataLoader<Hex, ResolvedENSData | null>(async (addresses) => {
    return Promise.all(
      addresses.map((address) =>
        resolveEnsData(publicClient, address, ensByQueryResolver),
      ),
    );
  }, dataLoaderOptions);
}
