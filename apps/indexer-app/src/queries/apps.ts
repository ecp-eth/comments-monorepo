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
>;

export function useAppsQuery(options?: UseAppsQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAppsQueryKey(),
    queryFn: async ({ signal }) => {
      const listAppsResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/apps"), {
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
