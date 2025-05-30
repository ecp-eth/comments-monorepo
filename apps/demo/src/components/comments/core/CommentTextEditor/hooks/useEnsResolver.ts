import { useMemo, useState } from "react";
import { Hex } from "viem";
import { usePublicClient } from "wagmi";

export type ResolvedAddress = {
  address: Hex;
  label: string;
};

export type EnsResolverService = {
  resolveAddress(address: Hex): Promise<ResolvedAddress | null>;
  resolveName(name: string): Promise<ResolvedAddress | null>;
};

export function useEnsResolver(): EnsResolverService {
  const client = usePublicClient();
  const [addressCache] = useState(
    () => new Map<string, ResolvedAddress | null>(),
  );
  const [nameCache] = useState(() => new Map<string, ResolvedAddress | null>());

  return useMemo(
    () => ({
      async resolveAddress(address) {
        try {
          if (addressCache.has(address)) {
            return addressCache.get(address)!;
          }

          const ensName = await client?.getEnsName({
            address,
          });

          if (!ensName) {
            addressCache.set(address, null);

            return null;
          }

          addressCache.set(address, { address, label: ensName });

          return { address, label: ensName };
        } catch (e) {
          console.error("Could not resolve ENS name for address", address, e);

          return null;
        }
      },
      async resolveName(name) {
        try {
          if (nameCache.has(name)) {
            return nameCache.get(name)!;
          }

          const address = await client?.getEnsAddress({
            name,
          });

          if (!address) {
            nameCache.set(name, null);

            return null;
          }

          nameCache.set(name, { address, label: name });

          return { address, label: name };
        } catch (e) {
          console.error("Could not resolve ENS address for name", name, e);

          return null;
        }
      },
    }),
    [client, addressCache, nameCache],
  );
}
