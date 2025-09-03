import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { createWebhooksQueryKey } from "./query-keys";
import {
  AppWebhooksListResponseSchema,
  type AppWebhooksListResponseSchemaType,
} from "@/api/schemas/apps";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { UnauthorizedError } from "@/errors";

type UseWebhooksQueryOptions = Omit<
  UseQueryOptions<
    AppWebhooksListResponseSchemaType,
    Error,
    AppWebhooksListResponseSchemaType,
    ReturnType<typeof createWebhooksQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
};

export function useWebhooksQuery({
  appId,
  ...options
}: UseWebhooksQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhooksQueryKey(appId),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl(`/api/apps/${appId}/webhooks`), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch webhooks: ${response.statusText}`);
      }

      return AppWebhooksListResponseSchema.parse(await response.json());
    },
    ...options,
  });
}
