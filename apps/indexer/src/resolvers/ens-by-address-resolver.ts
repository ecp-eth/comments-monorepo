import DataLoader from "dataloader";
import {
  createPublicClient,
  http,
  type PublicClient,
  type Hex,
  getAddress,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";
import type { ResolvedENSData } from "./ens.types";

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

export type ENSByAddressResolverOptions = {
  chainRpcUrl: string;
} & DataLoader.Options<Hex, ResolvedENSData | null>;

export function createENSByAddressResolver({
  chainRpcUrl,
  ...dataLoaderOptions
}: ENSByAddressResolverOptions): ENSByAddressResolver {
  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(chainRpcUrl),
  });

  return new DataLoader<Hex, ResolvedENSData | null>(async (addresses) => {
    return Promise.all(
      addresses.map((address) => resolveEnsData(publicClient, address)),
    );
  }, dataLoaderOptions);
}
