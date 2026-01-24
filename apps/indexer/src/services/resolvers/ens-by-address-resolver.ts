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
import { DataLoader, type DataLoaderOptions } from "../dataloader";

async function resolveEnsData(
  client: PublicClient,
  address: Hex,
  ensByQueryResolver: ENSByQueryResolver,
): Promise<ResolvedENSData | null> {
  // `client.getEnsName` is a reverse lookup using oficial ENS reverse registrar, it returns user set "primary" ENS name
  // this is useful for users who has many ENS names and allow us to use the primary one.
  let name: string | undefined =
    (await client.getEnsName({ address })) ?? undefined;
  let avatarUrl: string | undefined;
  let url: string | undefined;

  if (name) {
    // since `getEnsName` returns a name from reverse registrar, which is configured by user manually,
    // there is a chance of misconfiguration and spoof, so we need to do a forward check
    const normalizedName = normalize(name);
    const ensAddress = await client.getEnsAddress({ name: normalizedName });

    if (!ensAddress || getAddress(ensAddress) !== getAddress(address)) {
      name = undefined;
    }
  }

  // oficial ENS reverse registrar might return undefined or due to misconfiguration.
  // so in this case we will use ensnode subgraph to cover the rest of the cases.
  if (!name) {
    const results = await ensByQueryResolver.load(address);

    if (results && results.length > 0 && results[0]) {
      const result = results[0];

      name = result.name;
      avatarUrl = result.avatarUrl ?? undefined;
      url = result.url;
    }
  }

  if (!name) {
    return null;
  }

  const normalizedName = normalize(name);

  return {
    address,
    name: normalizedName,
    // ensByQueryResolver will try to query avatar url using RPC if ensnode didnt return it
    // so we don't have to here
    avatarUrl: avatarUrl ?? null,
    url: url ?? `https://app.ens.domains/${address}`,
  };
}

export type ENSByAddressResolverOptions = {
  chainRpcUrl: string;
  ensByQueryResolver: ENSByQueryResolver;
} & Omit<DataLoaderOptions<Hex, ResolvedENSData | null>, "cacheKeyFn" | "name">;

export class ENSByAddressResolver extends DataLoader<
  Hex,
  ResolvedENSData | null
> {
  constructor({
    chainRpcUrl,
    ensByQueryResolver,
    ...dataLoaderOptions
  }: ENSByAddressResolverOptions) {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(chainRpcUrl),
    });

    super(
      async (addresses) => {
        return Promise.all(
          addresses.map((address) =>
            resolveEnsData(publicClient, address, ensByQueryResolver),
          ),
        );
      },
      {
        ...dataLoaderOptions,
        cacheKeyFn(key) {
          return key.toLowerCase() as Hex;
        },
        name: "ENSByAddressResolver",
      },
    );
  }
}
