import {
  type AppCreateRequestSchemaType,
  AppCreateResponseSchema,
  type AppCreateResponseSchemaType,
} from "@/api/schemas/apps";
import { useAuth } from "@/components/auth-provider";
import { UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { createFetchUrl } from "@/lib/utils";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { SafeParseError, ZodError } from "zod";

type UseCreateAppMutationOptions = Omit<
  UseMutationOptions<
    AppCreateResponseSchemaType,
    Error,
    AppCreateRequestSchemaType
  >,
  "mutationFn"
>;

export function useCreateAppMutation(options?: UseCreateAppMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const appCreateResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/apps"), {
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify(values),
        });
      });

      if (appCreateResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appCreateResponse.status === 400) {
        const data: SafeParseError<AppCreateResponseSchemaType> =
          await appCreateResponse.json();

        throw ZodError.create(data.error.issues);
      }

      if (!appCreateResponse.ok) {
        throw new Error(
          `Failed to create app: ${appCreateResponse.statusText}`,
        );
      }

      return AppCreateResponseSchema.parse(await appCreateResponse.json());
    },
    ...options,
  });
}
