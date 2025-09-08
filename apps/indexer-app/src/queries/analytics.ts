import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { secureFetch } from "@/lib/secure-fetch";
import { useAuth } from "@/components/auth-provider";
import { createFetchUrl } from "@/lib/utils";
import { UnauthorizedError } from "@/errors";
import {
  AnalyticsKpiDeliveriesResponseSchema,
  AnalyticsKpiEventualSuccessResponseSchema,
  type AnalyticsKpiEventualSuccessResponseSchemaType,
  type AnalyticsKpiDeliveriesResponseSchemaType,
  type AnalyticsKpiFirstAttemptSuccessResponseSchemaType,
  AnalyticsKpiFirstAttemptSuccessResponseSchema,
  type AnalyticsKpiE2ELatencyResponseSchemaType,
  AnalyticsKpiE2ELatencyResponseSchema,
  AnalyticsKpiBacklogResponseSchemaType,
  AnalyticsKpiBacklogResponseSchema,
} from "@/api/schemas/analytics";
import {
  createAnalyticsKpiDeliveriesQueryKey,
  createAnalyticsKpiE2ELatencyQueryKey,
  createAnalyticsKpiEventualSuccessQueryKey,
  createAnalyticsKpiFirstAttemptSuccessQueryKey,
  createAnalyticsKpiBacklogQueryKey,
} from "./query-keys";

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

      if (!response.ok) {
        throw new Error(
          `Failed to fetch deliveries KPI: ${response.statusText}`,
        );
      }

      return AnalyticsKpiDeliveriesResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsKpiEventualSuccessQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiEventualSuccessResponseSchemaType,
    Error,
    AnalyticsKpiEventualSuccessResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiEventualSuccessQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAnalyticsKpiEventualSuccessQuery(
  options?: UseAnalyticsKpiEventualSuccessQueryOptions,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiEventualSuccessQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/analytics/kpi/eventual-success"), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch eventual success KPI: ${response.statusText}`,
        );
      }

      return AnalyticsKpiEventualSuccessResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}

type UseAnalyticsKpiFirstAttemptSuccessQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiFirstAttemptSuccessResponseSchemaType,
    Error,
    AnalyticsKpiFirstAttemptSuccessResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiFirstAttemptSuccessQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAnalyticsKpiFirstAttemptSuccessQuery(
  options?: UseAnalyticsKpiFirstAttemptSuccessQueryOptions,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiFirstAttemptSuccessQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(
          createFetchUrl("/api/analytics/kpi/first-attempt-success"),
          {
            signal,
            headers,
          },
        );
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch first attempt success KPI: ${response.statusText}`,
        );
      }

      return AnalyticsKpiFirstAttemptSuccessResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}

type UseAnalyticsKpiE2ELatencyQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiE2ELatencyResponseSchemaType,
    Error,
    AnalyticsKpiE2ELatencyResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiE2ELatencyQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAnalyticsKpiE2ELatencyQuery(
  options?: UseAnalyticsKpiE2ELatencyQueryOptions,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiE2ELatencyQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/analytics/kpi/e2e-latency"), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch e2e latency KPI: ${response.statusText}`,
        );
      }

      return AnalyticsKpiE2ELatencyResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsKpiBacklogQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiBacklogResponseSchemaType,
    Error,
    AnalyticsKpiBacklogResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiBacklogQueryKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAnalyticsKpiBacklogQuery(
  options?: UseAnalyticsKpiBacklogQueryOptions,
) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiBacklogQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        return fetch(createFetchUrl("/api/analytics/kpi/backlog"), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch backlog KPI: ${response.statusText}`);
      }

      return AnalyticsKpiBacklogResponseSchema.parse(await response.json());
    },
    ...options,
  });
}
