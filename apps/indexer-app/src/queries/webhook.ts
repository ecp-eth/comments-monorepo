import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { UnauthorizedError, WebhookNotFoundError } from "@/errors";
import {
  AppWebhookSchema,
  type AppWebhookSchemaType,
  type AppWebhookListDeliveryAttemptsResponseSchemaType,
  AppWebhookListDeliveryAttemptsResponseSchema,
  AppWebhookAnalyticsBacklogResponseSchema,
  type AppWebhookAnalyticsBacklogResponseSchemaType,
  type AppWebhookAnalyticsVolumeResponseSchemaType,
  AppWebhookAnalyticsVolumeResponseSchema,
} from "@/api/schemas/apps";
import {
  createWebhookAnalyticsBacklogQueryKey,
  createWebhookAnalyticsVolumeQueryKey,
  createWebhookDeliveryAttemptsQueryKey,
  createWebhookQueryKey,
} from "./query-keys";
import { useState } from "react";

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

type UseWebhookDeliveryAttemptsQueryOptions = Omit<
  UseQueryOptions<
    AppWebhookListDeliveryAttemptsResponseSchemaType,
    Error,
    AppWebhookListDeliveryAttemptsResponseSchemaType,
    ReturnType<typeof createWebhookDeliveryAttemptsQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
  webhookId: string;
};

export function useWebhookDeliveryAttemptsQuery({
  appId,
  webhookId,
  ...options
}: UseWebhookDeliveryAttemptsQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhookDeliveryAttemptsQueryKey(appId, webhookId),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(
          createFetchUrl(
            `/api/apps/${appId}/webhooks/${webhookId}/deliveries/attempts`,
          ),
          {
            signal,
            headers,
          },
        );
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (response.status === 404) {
        throw new WebhookNotFoundError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch webhook deliveries: ${response.statusText}`,
        );
      }

      return AppWebhookListDeliveryAttemptsResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}

type UseWebhookAnalyticsBacklogQueryOptions = Omit<
  UseQueryOptions<
    AppWebhookAnalyticsBacklogResponseSchemaType,
    Error,
    AppWebhookAnalyticsBacklogResponseSchemaType,
    ReturnType<typeof createWebhookAnalyticsBacklogQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
  webhookId: string;
};

export function useWebhookAnalyticsBacklogQuery({
  appId,
  webhookId,
  ...options
}: UseWebhookAnalyticsBacklogQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhookAnalyticsBacklogQueryKey(appId, webhookId),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(
          createFetchUrl(
            `/api/apps/${appId}/webhooks/${webhookId}/analytics/backlog`,
          ),
          {
            signal,
            headers,
          },
        );
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (response.status === 404) {
        throw new WebhookNotFoundError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch webhook analytics backlog: ${response.statusText}`,
        );
      }

      return AppWebhookAnalyticsBacklogResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}

type UseWebhookAnalyticsVolumeQueryOptions = Omit<
  UseQueryOptions<
    AppWebhookAnalyticsVolumeResponseSchemaType,
    Error,
    AppWebhookAnalyticsVolumeResponseSchemaType,
    ReturnType<typeof createWebhookAnalyticsVolumeQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
  webhookId: string;
  bucket: "7" | "30" | "90";
};

export function useWebhookAnalyticsVolumeQuery({
  appId,
  webhookId,
  bucket,
  ...options
}: UseWebhookAnalyticsVolumeQueryOptions) {
  const auth = useAuth();
  const [now] = useState(() => new Date());
  const from = new Date(now.getTime() - 1000 * 60 * 60 * 24 * Number(bucket));

  return useQuery({
    queryKey: createWebhookAnalyticsVolumeQueryKey(appId, webhookId, {
      bucket: "day",
      from,
      to: now,
    }),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl(
          `/api/apps/${appId}/webhooks/${webhookId}/analytics/volume`,
        );

        url.searchParams.set("bucket", "day");
        url.searchParams.set("from", from.toISOString());
        url.searchParams.set("to", now.toISOString());

        return fetch(url, {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (response.status === 404) {
        throw new WebhookNotFoundError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch webhook analytics volume: ${response.statusText}`,
        );
      }

      return AppWebhookAnalyticsVolumeResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}
