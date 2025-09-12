import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { UnauthorizedError, WebhookNotFoundError } from "@/errors";
import {
  AppWebhookSchema,
  type AppWebhookSchemaType,
} from "@/api/schemas/apps";
import { createWebhookQueryKey } from "./query-keys";

type UseWebhookQueryOptions = Omit<
  UseQueryOptions<
    AppWebhookSchemaType,
    Error,
    AppWebhookSchemaType,
    ReturnType<typeof createWebhookQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
  webhookId: string;
};

export function useWebhookQuery({
  appId,
  webhookId,
  ...options
}: UseWebhookQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhookQueryKey(appId, webhookId),
    queryFn: async ({ signal }) => {
      const webhookResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(
          createFetchUrl(`/api/apps/${appId}/webhooks/${webhookId}`),
          {
            signal,
            headers,
          },
        );
      });

      if (webhookResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (webhookResponse.status === 404) {
        throw new WebhookNotFoundError();
      }

      if (!webhookResponse.ok) {
        throw new Error(
          `Failed to fetch webhook: ${webhookResponse.statusText}`,
        );
      }

      return AppWebhookSchema.parse(await webhookResponse.json());
    },
    ...options,
  });
}
