import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { createAppsQueryKey } from "./query-keys";
import { UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import {
  ListAppsResponseSchema,
  type ListAppsResponseSchemaType,
} from "@/api/schemas/apps";
import { createFetchUrl } from "@/lib/utils";

type UseAppsQueryOptions = Omit<
  UseQueryOptions<
    ListAppsResponseSchemaType,
    Error,
    ListAppsResponseSchemaType,
    ReturnType<typeof createAppsQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  page?: number;
  limit?: number;
};

export function useAppsQuery({
  page,
  limit,
  ...options
}: UseAppsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAppsQueryKey({ page, limit }),
    queryFn: async ({ signal }) => {
      const listAppsResponse = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/apps");

        if (page) {
          url.searchParams.set("page", page.toString());
        }

        if (limit) {
          url.searchParams.set("limit", limit.toString());
        }

        return fetch(url, {
          signal,
          headers,
        });
      });

      if (listAppsResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (!listAppsResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${listAppsResponse.statusText}`,
        );
      }

      return ListAppsResponseSchema.parse(await listAppsResponse.json());
    },
    ...options,
  });
}
