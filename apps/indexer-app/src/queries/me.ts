import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { createMeQueryKey } from "./query-keys";
import { UnauthorizedError } from "@/errors";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import {
  UserResponseSchema,
  type UserResponseSchemaType,
} from "@/api/schemas/user";
import { createFetchUrl } from "@/lib/utils";

type UseMeQueryOptions = Omit<
  UseQueryOptions<
    UserResponseSchemaType,
    Error,
    UserResponseSchemaType,
    ReturnType<typeof createMeQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useMeQuery(options?: UseMeQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createMeQueryKey(),
    queryFn: async ({ signal }) => {
      const listAppsResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/users/me"), {
          signal,
          headers,
        });
      });

      if (listAppsResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (!listAppsResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${listAppsResponse.statusText}`,
        );
      }

      return UserResponseSchema.parse(await listAppsResponse.json());
    },
    ...options,
  });
}
