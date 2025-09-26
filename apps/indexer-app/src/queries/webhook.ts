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
  type AppWebhookListDeliveriesResponseSchemaType,
  AppWebhookListDeliveriesResponseSchema,
} from "@/api/schemas/apps";
import {
  createWebhookDeliveriesQueryKey,
  createWebhookDeliveryAttemptsQueryKey,
  createWebhookQueryKey,
} from "./query-keys";

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

type UseWebhookDeliveriesQueryOptions = Omit<
  UseQueryOptions<
    AppWebhookListDeliveriesResponseSchemaType,
    Error,
    AppWebhookListDeliveriesResponseSchemaType,
    ReturnType<typeof createWebhookDeliveriesQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
  webhookId: string;
  page?: {
    cursor: string;
    direction: "previous" | "next";
  };
  limit?: number;
  status?: ("pending" | "processing" | "failed" | "success")[];
};

export function useWebhookDeliveriesQuery({
  appId,
  webhookId,
  page,
  limit,
  status,
  ...options
}: UseWebhookDeliveriesQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhookDeliveriesQueryKey({
      appId,
      webhookId,
      page,
      limit,
      status,
    }),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl(
          `/api/apps/${appId}/webhooks/${webhookId}/deliveries`,
        );

        if (page) {
          if (page.direction === "next") {
            url.searchParams.set("after", page.cursor);
          } else {
            url.searchParams.set("before", page.cursor);
          }
        }

        if (limit) {
          url.searchParams.set("limit", limit.toString());
        }

        if (status && status.length > 0) {
          url.searchParams.set("status", status.join(","));
        }

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
          `Failed to fetch webhook deliveries: ${response.statusText}`,
        );
      }

      return AppWebhookListDeliveriesResponseSchema.parse(
        await response.json(),
      );
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
  deliveryId?: string;
  page?: {
    cursor: string;
    direction: "previous" | "next";
  };
  limit?: number;
};

export function useWebhookDeliveryAttemptsQuery({
  appId,
  webhookId,
  deliveryId,
  page,
  limit,
  ...options
}: UseWebhookDeliveryAttemptsQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createWebhookDeliveryAttemptsQueryKey({
      appId,
      webhookId,
      deliveryId,
      page,
      limit,
    }),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl(
          `/api/apps/${appId}/webhooks/${webhookId}/deliveries/attempts`,
        );

        if (page) {
          if (page.direction === "next") {
            url.searchParams.set("after", page.cursor);
          } else {
            url.searchParams.set("before", page.cursor);
          }
        }

        if (limit) {
          url.searchParams.set("limit", limit.toString());
        }

        if (deliveryId) {
          url.searchParams.set("webhookDeliveryId", deliveryId);
        }

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
