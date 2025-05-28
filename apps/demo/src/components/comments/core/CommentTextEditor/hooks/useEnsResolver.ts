import { useMemo } from "react";
import type { EnsResolverService } from "../extensions/types";
import { usePublicClient } from "wagmi";

export function useEnsResolver(): EnsResolverService {
  const client = usePublicClient();

  return useMemo(
    () => ({
      async resolveAddress(address) {
        console.log("resolveAddress", address);

        try {
          const ensName = await client?.getEnsName({
            address,
          });

          console.log("ensName", ensName);

          if (!ensName) {
            return null;
          }

          return { address, label: ensName };
        } catch (e) {
          console.error("Could not resolve ENS name for address", address, e);

          return null;
        }
      },
      async resolveName(name) {
        console.log("resolveName", name);

        try {
          const address = await client?.getEnsAddress({
            name,
          });

          console.log("address", address);

          if (!address) {
            return null;
          }

          return { address, label: name };
        } catch (e) {
          console.error("Could not resolve ENS address for name", name, e);

          return null;
        }
      },
    }),
    [client],
  );
}
