import {
  type AppCreateRequestSchemaType,
  AppCreateResponseSchema,
  type AppCreateResponseSchemaType,
  type AppUpdateRequestSchemaType,
  type AppUpdateResponseSchemaType,
  AppUpdateResponseSchema,
  type AppSecretRefreshResponseSchemaType,
  AppSecretRefreshResponseSchema,
  AppDeleteResponseSchema,
  type AppDeleteResponseSchemaType,
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

type UseRenameAppMutationOptions = Omit<
  UseMutationOptions<
    AppUpdateResponseSchemaType,
    Error,
    AppUpdateRequestSchemaType
  >,
  "mutationFn"
> & {
  appId: string;
};

export function useRenameAppMutation({
  appId,
  ...options
}: UseRenameAppMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const appRenameResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl(`/api/apps/${appId}`), {
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          method: "PATCH",
          body: JSON.stringify(values),
        });
      });

      if (appRenameResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appRenameResponse.status === 400) {
        const data: SafeParseError<AppUpdateResponseSchemaType> =
          await appRenameResponse.json();

        throw ZodError.create(data.error.issues);
      }

      if (!appRenameResponse.ok) {
        throw new Error(
          `Failed to rename app: ${appRenameResponse.statusText}`,
        );
      }

      return AppUpdateResponseSchema.parse(await appRenameResponse.json());
    },
    ...options,
  });
}

type UseRefreshAppSecretMutationOptions = Omit<
  UseMutationOptions<AppSecretRefreshResponseSchemaType, Error, void>,
  "mutationFn"
> & {
  appId: string;
};

export function useRefreshAppSecretMutation({
  appId,
  ...options
}: UseRefreshAppSecretMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async () => {
      const appSecretRefreshResponse = await secureFetch(
        auth,
        async ({ headers }) => {
          return fetch(createFetchUrl(`/api/apps/${appId}/secret/refresh`), {
            headers: {
              ...headers,
            },
            method: "POST",
          });
        },
      );

      if (appSecretRefreshResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appSecretRefreshResponse.status === 400) {
        throw new Error(
          `Failed to refresh app secret: ${appSecretRefreshResponse.statusText}`,
        );
      }

      if (!appSecretRefreshResponse.ok) {
        throw new Error(
          `Failed to refresh app secret: ${appSecretRefreshResponse.statusText}`,
        );
      }

      return AppSecretRefreshResponseSchema.parse(
        await appSecretRefreshResponse.json(),
      );
    },
    ...options,
  });
}

type UseDeleteAppMutationOptions = Omit<
  UseMutationOptions<AppDeleteResponseSchemaType, Error, void>,
  "mutationFn"
> & {
  appId: string;
};

export function useDeleteAppMutation({
  appId,
  ...options
}: UseDeleteAppMutationOptions) {
  const auth = useAuth();

  return useMutation({
    mutationFn: async () => {
      const appDeleteResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl(`/api/apps/${appId}`), {
          headers: {
            ...headers,
          },
          method: "DELETE",
        });
      });

      if (appDeleteResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appDeleteResponse.status === 400) {
        throw new Error(
          `Failed to delete app: ${appDeleteResponse.statusText}`,
        );
      }

      if (!appDeleteResponse.ok) {
        throw new Error(
          `Failed to delete app: ${appDeleteResponse.statusText}`,
        );
      }

      return AppDeleteResponseSchema.parse(await appDeleteResponse.json());
    },
    ...options,
  });
}
