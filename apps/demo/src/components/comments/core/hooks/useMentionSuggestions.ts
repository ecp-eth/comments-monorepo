import type { MentionSuggestionsResponseSchemaType } from "@/app/api/mention-suggestions/route";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useEffect } from "react";
import { useChainId } from "wagmi";

function createQueryKey(char: string, chainId: number, query: string) {
  return ["mention-suggestions", char, chainId, query];
}

export function useMentionSuggestions(char: string, debounceMs: number = 200) {
  const client = useQueryClient();
  const chainId = useChainId();
  const previousQuery = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (previousQuery.current) {
        client.cancelQueries({
          exact: true,
          queryKey: createQueryKey(char, chainId, previousQuery.current),
        });
      }

      previousQuery.current = query;

      return client.fetchQuery({
        queryKey: createQueryKey(char, chainId, query),
        queryFn: async ({ signal }) => {
          const urlParams = new URLSearchParams({
            query,
            chainId: chainId.toString(),
            char,
          });

          const response = await fetch(
            `/api/mention-suggestions?${urlParams.toString()}`,
            {
              signal,
            },
          );

          return response.json() as Promise<MentionSuggestionsResponseSchemaType>;
        },
      });
    },
    [client, char, chainId],
  );

  const debouncedFetch = useCallback(
    (query: string): Promise<MentionSuggestionsResponseSchemaType> => {
      return new Promise((resolve, reject) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await fetchSuggestions(query);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceMs);
      });
    },
    [fetchSuggestions, debounceMs],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFetch;
}
