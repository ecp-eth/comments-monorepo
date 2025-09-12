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
  page?: number;
  limit?: number;
};

export function useWebhooksQuery({
  appId,
  page,
  limit,
  ...options
}: UseWebhooksQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhooksQueryKey({ appId, page, limit }),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl(`/api/apps/${appId}/webhooks`);

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
