import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { createAppQueryKey } from "./query-keys";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { AppNotFoundError, UnauthorizedError } from "@/errors";
import { AppSchema, type AppSchemaType } from "@/api/schemas/apps";

type UseAppQueryOptions = Omit<
  UseQueryOptions<
    AppSchemaType,
    Error,
    AppSchemaType,
    ReturnType<typeof createAppQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  appId: string;
};

export function useAppQuery({ appId, ...options }: UseAppQueryOptions) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAppQueryKey(appId),
    queryFn: async ({ signal }) => {
      const appResponse = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl(`/api/apps/${appId}`), {
          signal,
          headers,
        });
      });

      if (appResponse.status === 401) {
        throw new UnauthorizedError();
      }

      if (appResponse.status === 404) {
        throw new AppNotFoundError();
      }

      if (!appResponse.ok) {
        throw new Error(`Failed to fetch app: ${appResponse.statusText}`);
      }

      return AppSchema.parse(await appResponse.json());
    },
    ...options,
  });
}
