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
import type { ENSByQueryResolver } from "./ens-by-query-resolver";

export type ENSByAddressResolver = DataLoader<Hex, ResolvedENSData | null>;

async function resolveEnsData(
  client: PublicClient,
  address: Hex,
  ensByQueryResolver: ENSByQueryResolver,
): Promise<ResolvedENSData | null> {
  const name = await client.getEnsName({ address });

  if (!name) {
    // try to search by address (this is helpful if the address is a .base.eth for example)
    const results = await ensByQueryResolver.load(address);

    if (results && results.length > 0) {
      return {
        address: results[0]!.address,
        avatarUrl: results[0]!.avatarUrl,
        name: results[0]!.name,
        url: results[0]!.url,
      };
    }

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
