export function createAppsQueryKey({
  page,
  limit,
}: {
  page?: number;
  limit?: number;
} = {}) {
  return ["apps", page, limit] as const;
}

export function createAppQueryKey(appId: string) {
  return ["app", appId] as const;
}

export function createMeQueryKey() {
  return ["me"] as const;
}

export function createWebhookQueryKey(appId: string, webhookId: string) {
  return ["webhook", appId, webhookId] as const;
}

export function createWebhooksQueryKey({
  appId,
  page,
  limit,
}: {
  appId: string;
  page?: number;
  limit?: number;
}) {
  return ["webhooks", appId, page, limit] as const;
}

export function createWebhookDeliveryAttemptsQueryKey(params: {
  appId: string;
  webhookId: string;
  page?: {
    cursor: string;
    direction: "previous" | "next";
  };
  limit?: number;
}) {
  return [
    "webhook-delivery-attempts",
    params.appId,
    params.webhookId,
    params.page?.cursor,
    params.page?.direction,
    params.limit,
  ] as const;
}

type AnalyticsKpiDeliveriesQueryParams = {
  from?: Date;
  to?: Date;
  appId?: string;
};

export function createAnalyticsKpiDeliveriesQueryKey(
  params?: AnalyticsKpiDeliveriesQueryParams,
) {
  return [
    "analytics-kpi-deliveries",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
    params?.appId,
  ] as const;
}

type AnalyticsKpiEventualSuccessQueryParams = {
  from?: Date;
  to?: Date;
  appId?: string;
};

export function createAnalyticsKpiEventualSuccessQueryKey(
  params?: AnalyticsKpiEventualSuccessQueryParams,
) {
  return [
    "analytics-kpi-eventual-success",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
    params?.appId,
  ] as const;
}

type AnalyticsKpiFirstAttemptSuccessQueryParams = {
  from?: Date;
  to?: Date;
  appId?: string;
};

export function createAnalyticsKpiFirstAttemptSuccessQueryKey(
  params?: AnalyticsKpiFirstAttemptSuccessQueryParams,
) {
  return [
    "analytics-kpi-first-attempt-success",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
    params?.appId,
  ] as const;
}

type AnalyticsKpiE2ELatencyQueryParams = {
  from?: Date;
  to?: Date;
  appId?: string;
};

export function createAnalyticsKpiE2ELatencyQueryKey(
  params?: AnalyticsKpiE2ELatencyQueryParams,
) {
  return [
    "analytics-kpi-e2e-latency",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
    params?.appId,
  ] as const;
}

export function createAnalyticsKpiBacklogQueryKey() {
  return ["analytics-kpi-backlog"] as const;
}

type AnalyticsKpiDeliveredUnderMinuteQueryParams = {
  from?: Date;
  to?: Date;
};

export function createAnalyticsKpiDeliveredUnderMinuteQueryKey(
  params?: AnalyticsKpiDeliveredUnderMinuteQueryParams,
) {
  return [
    "analytics-kpi-delivered-under-minute",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsVolumeQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsVolumeQueryKey(
  params?: AnalyticsVolumeQueryParams,
) {
  return [
    "analytics-volume",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsTerminalQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsTerminalQueryKey(
  params?: AnalyticsTerminalQueryParams,
) {
  return [
    "analytics-terminal",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsSuccessRatesQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsSuccessRatesQueryKey(
  params?: AnalyticsSuccessRatesQueryParams,
) {
  return [
    "analytics-success-rates",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsE2ELatencyQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsE2ELatencyQueryKey(
  params?: AnalyticsE2ELatencyQueryParams,
) {
  return [
    "analytics-e2e-latency",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsSlaBandsQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsSlaBandsQueryKey(
  params?: AnalyticsSlaBandsQueryParams,
) {
  return [
    "analytics-sla-bands",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsErrorsQueryParams = {
  from?: Date;
  to?: Date;
  bucket?: string;
};

export function createAnalyticsErrorsQueryKey(
  params?: AnalyticsErrorsQueryParams,
) {
  return [
    "analytics-errors",
    params?.bucket,
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}
