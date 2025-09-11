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
  type AnalyticsKpiBacklogResponseSchemaType,
  AnalyticsKpiBacklogResponseSchema,
  type AnalyticsKpiDeliveredUnderMinuteResponseSchemaType,
  AnalyticsKpiDeliveredUnderMinuteResponseSchema,
  type AnalyticsVolumeResponseSchemaType,
  AnalyticsVolumeResponseSchema,
  type AnalyticsTerminalResponseSchemaType,
  AnalyticsTerminalResponseSchema,
  type AnalyticsSuccessRatesResponseSchemaType,
  AnalyticsSuccessRatesResponseSchema,
  type AnalyticsE2ELatencyResponseSchemaType,
  AnalyticsE2ELatencyResponseSchema,
  type AnalyticsSlaBandsResponseSchemaType,
  AnalyticsSlaBandsResponseSchema,
  type AnalyticsErrorsResponseSchemaType,
  AnalyticsErrorsResponseSchema,
} from "@/api/schemas/analytics";
import {
  createAnalyticsKpiDeliveriesQueryKey,
  createAnalyticsKpiE2ELatencyQueryKey,
  createAnalyticsKpiEventualSuccessQueryKey,
  createAnalyticsKpiFirstAttemptSuccessQueryKey,
  createAnalyticsKpiBacklogQueryKey,
  createAnalyticsKpiDeliveredUnderMinuteQueryKey,
  createAnalyticsVolumeQueryKey,
  createAnalyticsTerminalQueryKey,
  createAnalyticsSuccessRatesQueryKey,
  createAnalyticsE2ELatencyQueryKey,
  createAnalyticsSlaBandsQueryKey,
  createAnalyticsErrorsQueryKey,
} from "./query-keys";

type AnalyticsParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
  appId?: string;
};

function analyticsParamsToSearchParams(
  url: URL,
  params?: AnalyticsParams,
): URL {
  if (params?.from) {
    url.searchParams.set("from", params.from.toISOString());
  }

  if (params?.to) {
    url.searchParams.set("to", params.to.toISOString());
  }

  if (params?.bucket) {
    url.searchParams.set("bucket", params.bucket);
  }

  if (params?.appId) {
    url.searchParams.set("appId", params.appId);
  }

  return url;
}

type UseAnalyticsKpiDeliveriesQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiDeliveriesResponseSchemaType,
    Error,
    AnalyticsKpiDeliveriesResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiDeliveriesQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: Omit<AnalyticsParams, "bucket">;
};

export function useAnalyticsKpiDeliveriesQuery({
  params,
  ...options
}: UseAnalyticsKpiDeliveriesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiDeliveriesQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/kpi/deliveries");

        return fetch(analyticsParamsToSearchParams(url, params), {
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
> & {
  params?: Omit<AnalyticsParams, "bucket">;
};

export function useAnalyticsKpiEventualSuccessQuery({
  params,
  ...options
}: UseAnalyticsKpiEventualSuccessQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiEventualSuccessQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/kpi/eventual-success");

        return fetch(analyticsParamsToSearchParams(url, params), {
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
> & {
  params?: Omit<AnalyticsParams, "bucket">;
};

export function useAnalyticsKpiFirstAttemptSuccessQuery({
  params,
  ...options
}: UseAnalyticsKpiFirstAttemptSuccessQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiFirstAttemptSuccessQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/kpi/first-attempt-success");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
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
> & {
  params?: Omit<AnalyticsParams, "bucket">;
};

export function useAnalyticsKpiE2ELatencyQuery({
  params,
  ...options
}: UseAnalyticsKpiE2ELatencyQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiE2ELatencyQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/kpi/e2e-latency");

        return fetch(analyticsParamsToSearchParams(url, params), {
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

type UseAnalyticsKpiDeliveredUnderMinuteQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsKpiDeliveredUnderMinuteResponseSchemaType,
    Error,
    AnalyticsKpiDeliveredUnderMinuteResponseSchemaType,
    ReturnType<typeof createAnalyticsKpiDeliveredUnderMinuteQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: Omit<AnalyticsParams, "bucket">;
};

export function useAnalyticsKpiDeliveredUnderMinuteQuery({
  params,
  ...options
}: UseAnalyticsKpiDeliveredUnderMinuteQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsKpiDeliveredUnderMinuteQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/kpi/delivered-under-minute");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch delivered under minute KPI: ${response.statusText}`,
        );
      }

      return AnalyticsKpiDeliveredUnderMinuteResponseSchema.parse(
        await response.json(),
      );
    },
    ...options,
  });
}

type UseAnalyticsVolumeQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsVolumeResponseSchemaType,
    Error,
    AnalyticsVolumeResponseSchemaType,
    ReturnType<typeof createAnalyticsVolumeQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsVolumeQuery({
  params,
  ...options
}: UseAnalyticsVolumeQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsVolumeQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/volume");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics volume: ${response.statusText}`,
        );
      }

      return AnalyticsVolumeResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsTerminalQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsTerminalResponseSchemaType,
    Error,
    AnalyticsTerminalResponseSchemaType,
    ReturnType<typeof createAnalyticsTerminalQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsTerminalQuery({
  params,
  ...options
}: UseAnalyticsTerminalQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsTerminalQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/terminal");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics terminal: ${response.statusText}`,
        );
      }

      return AnalyticsTerminalResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsSuccessRatesQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsSuccessRatesResponseSchemaType,
    Error,
    AnalyticsSuccessRatesResponseSchemaType,
    ReturnType<typeof createAnalyticsSuccessRatesQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsSuccessRatesQuery({
  params,
  ...options
}: UseAnalyticsSuccessRatesQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsSuccessRatesQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/success-rates");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics success rates: ${response.statusText}`,
        );
      }

      return AnalyticsSuccessRatesResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsE2ELatencyQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsE2ELatencyResponseSchemaType,
    Error,
    AnalyticsE2ELatencyResponseSchemaType,
    ReturnType<typeof createAnalyticsE2ELatencyQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsE2ELatencyQuery({
  params,
  ...options
}: UseAnalyticsE2ELatencyQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsE2ELatencyQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/e2e-latency");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics e2e latency: ${response.statusText}`,
        );
      }

      return AnalyticsE2ELatencyResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsSlaBandsQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsSlaBandsResponseSchemaType,
    Error,
    AnalyticsSlaBandsResponseSchemaType,
    ReturnType<typeof createAnalyticsSlaBandsQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsSlaBandsQuery({
  params,
  ...options
}: UseAnalyticsSlaBandsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsSlaBandsQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/sla-bands");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics sla bands: ${response.statusText}`,
        );
      }

      return AnalyticsSlaBandsResponseSchema.parse(await response.json());
    },
    ...options,
  });
}

type UseAnalyticsErrorsQueryOptions = Omit<
  UseQueryOptions<
    AnalyticsErrorsResponseSchemaType,
    Error,
    AnalyticsErrorsResponseSchemaType,
    ReturnType<typeof createAnalyticsErrorsQueryKey>
  >,
  "queryKey" | "queryFn"
> & {
  params?: AnalyticsParams;
};

export function useAnalyticsErrorsQuery({
  params,
  ...options
}: UseAnalyticsErrorsQueryOptions = {}) {
  const auth = useAuth();

  return useQuery({
    queryKey: createAnalyticsErrorsQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await secureFetch(auth, async ({ headers }) => {
        const url = createFetchUrl("/api/analytics/errors");

        return fetch(analyticsParamsToSearchParams(url, params), {
          signal,
          headers,
        });
      });

      if (response.status === 401) {
        throw new UnauthorizedError();
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch analytics errors: ${response.statusText}`,
        );
      }

      return AnalyticsErrorsResponseSchema.parse(await response.json());
    },
    ...options,
  });
}
