import {
  type AppWebhookCreateRequestSchemaType,
  AppWebhookCreateResponseSchema,
  type AppWebhookCreateResponseSchemaType,
  type AppWebhookDeleteResponseSchemaType,
  AppWebhookDeleteResponseSchema,
  type AppWebhookUpdateRequestSchemaType,
  AppWebhookUpdateResponseSchema,
  type AppWebhookUpdateResponseSchemaType,
} from "@/api/schemas/apps";
import { useAuth } from "@/components/auth-provider";
import { UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { createFetchUrl } from "@/lib/utils";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { SafeParseError, ZodError } from "zod";

type UseCreateWebhookMutationOptions = Omit<
  UseMutationOptions<
    AppWebhookCreateResponseSchemaType,
    Error,
    AppWebhookCreateRequestSchemaType
  >,
  "mutationFn"
> & {
  appId: string;
};

export function useCreateWebhookMutation({
  appId,
  ...options
}: UseCreateWebhookMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const appWebhookCreateResponse = await secureFetch(
        auth,
        async ({ headers }) => {
          return fetch(createFetchUrl(`/api/apps/${appId}/webhooks`), {
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(values),
          });
        },
      );

      if (appWebhookCreateResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appWebhookCreateResponse.status === 400) {
        const data: SafeParseError<AppWebhookCreateResponseSchemaType> =
          await appWebhookCreateResponse.json();

        throw ZodError.create(data.error.issues);
      }

      if (!appWebhookCreateResponse.ok) {
        throw new Error(
          `Failed to create webhook: ${appWebhookCreateResponse.statusText}`,
        );
      }

      return AppWebhookCreateResponseSchema.parse(
        await appWebhookCreateResponse.json(),
      );
    },
    ...options,
  });
}

type UseUpdateWebhookMutationOptions = Omit<
  UseMutationOptions<
    AppWebhookUpdateResponseSchemaType,
    Error,
    AppWebhookUpdateRequestSchemaType
  >,
  "mutationFn"
> & {
  appId: string;
  webhookId: string;
};

export function useUpdateWebhookMutation({
  appId,
  webhookId,
  ...options
}: UseUpdateWebhookMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const appWebhookUpdateResponse = await secureFetch(
        auth,
        async ({ headers }) => {
          return fetch(
            createFetchUrl(`/api/apps/${appId}/webhooks/${webhookId}`),
            {
              headers: {
                ...headers,
                "Content-Type": "application/json",
              },
              method: "PATCH",
              body: JSON.stringify(values),
            },
          );
        },
      );

      if (appWebhookUpdateResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appWebhookUpdateResponse.status === 400) {
        const data: SafeParseError<AppWebhookUpdateResponseSchemaType> =
          await appWebhookUpdateResponse.json();

        throw ZodError.create(data.error.issues);
      }

      if (!appWebhookUpdateResponse.ok) {
        throw new Error(
          `Failed to update webhook: ${appWebhookUpdateResponse.statusText}`,
        );
      }

      return AppWebhookUpdateResponseSchema.parse(
        await appWebhookUpdateResponse.json(),
      );
    },
    ...options,
  });
}

type UseDeleteWebhookMutationOptions = Omit<
  UseMutationOptions<AppWebhookDeleteResponseSchemaType, Error, void>,
  "mutationFn"
> & {
  appId: string;
  webhookId: string;
};

export function useDeleteWebhookMutation({
  appId,
  webhookId,
  ...options
}: UseDeleteWebhookMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async () => {
      const appWebhookDeleteResponse = await secureFetch(
        auth,
        async ({ headers }) => {
          return fetch(
            createFetchUrl(`/api/apps/${appId}/webhooks/${webhookId}`),
            {
              headers: {
                ...headers,
              },
              method: "DELETE",
            },
          );
        },
      );

      if (appWebhookDeleteResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appWebhookDeleteResponse.status === 400) {
        throw new Error(
          `Failed to delete webhook: ${appWebhookDeleteResponse.statusText}`,
        );
      }

      if (!appWebhookDeleteResponse.ok) {
        throw new Error(
          `Failed to delete webhook: ${appWebhookDeleteResponse.statusText}`,
        );
      }

      return AppWebhookDeleteResponseSchema.parse(
        await appWebhookDeleteResponse.json(),
      );
    },
    ...options,
  });
}
