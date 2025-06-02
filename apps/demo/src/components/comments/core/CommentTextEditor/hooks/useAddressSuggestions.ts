import type { AddressSuggestionsResponseSchemaType } from "@/app/api/address-suggestions/route";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useChainId } from "wagmi";

export function useAddressSuggestions() {
  const client = useQueryClient();
  const chainId = useChainId();
  const previousQuery = useRef<string | null>(null);

  return useCallback(
    async (query: string) => {
      if (previousQuery.current) {
        client.cancelQueries({
          exact: true,
          queryKey: ["address-suggestions", chainId, previousQuery.current],
        });
      }

      previousQuery.current = query;

      return client.fetchQuery({
        queryKey: ["address-suggestions", chainId, query],
        queryFn: async ({ signal }) => {
          const urlParams = new URLSearchParams({
            query,
            chainId: chainId.toString(),
          });

          const response = await fetch(
            `/api/address-suggestions?${urlParams.toString()}`,
            {
              signal,
            },
          );

          return response.json() as Promise<AddressSuggestionsResponseSchemaType>;
        },
      });
    },
    [client, chainId],
  );
}
