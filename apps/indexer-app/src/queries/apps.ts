import { useQuery } from "@tanstack/react-query";
import { createAppsQueryKey } from "./query-keys";
import { ChannelNotFoundError, UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { ListAppsResponseSchema } from "@/api/schemas/apps";

export function useAppsQuery() {
  const auth = useAuth();

  return useQuery({
    queryKey: createAppsQueryKey(),
    queryFn: async ({ signal }) => {
      const listAppsResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch("/api/apps", {
          signal,
          headers,
        });
      });

      if (listAppsResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (listAppsResponse.status === 404) {
        throw new ChannelNotFoundError();
      }

      if (!listAppsResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${listAppsResponse.statusText}`,
        );
      }

      return ListAppsResponseSchema.parse(await listAppsResponse.json());
    },
  });
}
