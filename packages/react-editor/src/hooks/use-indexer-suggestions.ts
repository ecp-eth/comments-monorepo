import { fetchAutocomplete } from "@ecp.eth/sdk/indexer";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  EditorSuggestionsService,
  SearchSuggestionsFunction,
} from "../types";

function createQueryKey(char: string, query: string): QueryKey {
  return ["mention-suggestions", char, query];
}

export type UseIndexerSuggestionsOptions = {
  /**
   * URL of the indexer API.
   *
   * If not provided, the default indexer API URL will be used.
   */
  indexerApiUrl?: string;
  /**
   * The debounce time in milliseconds.
   *
   * @default 200
   */
  debounceMs?: number;
};

/**
 * Hook to fetch suggestions from indexer API.
 */
export function useIndexerSuggestions({
  indexerApiUrl,
  debounceMs = 200,
}: UseIndexerSuggestionsOptions = {}): EditorSuggestionsService {
  const client = useQueryClient();
  const previousQuery = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  const fetchSuggestions = useCallback<SearchSuggestionsFunction>(
    async (query, char) => {
      if (previousQuery.current) {
        client.cancelQueries({
          exact: true,
          queryKey: createQueryKey(char, previousQuery.current),
        });
      }

      previousQuery.current = query;

      return client.fetchQuery({
        queryKey: createQueryKey(char, query),
        queryFn: async ({ signal }) => {
          return fetchAutocomplete({
            apiUrl: indexerApiUrl,
            query,
            char,
            signal,
          });
        },
      });
    },
    [client, indexerApiUrl],
  );

  const debouncedFetch = useCallback<SearchSuggestionsFunction>(
    (query, char) => {
      return new Promise((resolve, reject) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await fetchSuggestions(query, char);
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

  return useMemo(() => {
    return {
      search: debouncedFetch,
    };
  }, [debouncedFetch]);
}
