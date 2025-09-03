import {
  type AppWebhookCreateRequestSchemaType,
  AppWebhookCreateResponseSchema,
  type AppWebhookCreateResponseSchemaType,
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
