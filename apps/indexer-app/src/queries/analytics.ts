import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { UnauthorizedError } from "@/errors";
import {
  AnalyticsKpiDeliveriesResponseSchema,
  type AnalyticsKpiDeliveriesResponseSchemaType,
} from "@/api/schemas/analytics";
import { createAnalyticsKpiDeliveriesQueryKey } from "./query-keys";

type UseAnalyticsKpiDeliveriesQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiDeliveriesResponseSchemaType,
    Error,
    AnalyticsKpiDeliveriesResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiDeliveriesQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAnalyticsKpiDeliveriesQuery(
  options?: UseAnalyticsKpiDeliveriesQueryOptions,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiDeliveriesQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/analytics/kpi/deliveries"), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      return AnalyticsKpiDeliveriesResponseSchema.parse(await response.json());
    },
    ...options,
  });
}
