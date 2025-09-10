export function createAppsQueryKey() {
  return ["apps"] as const;
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

export function createWebhooksQueryKey(appId: string) {
  return ["webhooks", appId] as const;
}

export function createWebhookDeliveryAttemptsQueryKey(
  appId: string,
  webhookId: string,
) {
  return ["webhook-delivery-attempts", appId, webhookId] as const;
}

export function createWebhookAnalyticsBacklogQueryKey(
  appId: string,
  webhookId: string,
) {
  return ["webhook-analytics-backlog", appId, webhookId] as const;
}

export function createWebhookAnalyticsVolumeQueryKey(
  appId: string,
  webhookId: string,
  params?: Partial<{
    from: Date;
    to: Date;
    tz: string;
    bucket: string;
  }>,
) {
  return [
    "webhook-analytics-volume",
    appId,
    webhookId,
    params?.bucket,
    params?.from,
    params?.to,
    params?.tz,
  ] as const;
}

export function createWebhookAnalyticsLatencyResponseQueryKey(
  appId: string,
  webhookId: string,
  params?: Partial<{
    from: Date;
    to: Date;
    bucket: string;
  }>,
) {
  return [
    "webhook-analytics-latency-response",
    appId,
    webhookId,
    params?.bucket,
    params?.from,
    params?.to,
  ] as const;
}

export function createWebhookAnalyticsLatencyResponseHistogramQueryKey(
  appId: string,
  webhookId: string,
  params?: Partial<{
    from: Date;
    to: Date;
  }>,
) {
  return [
    "webhook-analytics-latency-response-histogram",
    appId,
    webhookId,
    params?.from,
    params?.to,
  ] as const;
}

type AnalyticsKpiDeliveriesQueryParams = {
  from?: Date;
  to?: Date;
};

export function createAnalyticsKpiDeliveriesQueryKey(
  params?: AnalyticsKpiDeliveriesQueryParams,
) {
  return [
    "analytics-kpi-deliveries",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsKpiEventualSuccessQueryParams = {
  from?: Date;
  to?: Date;
};

export function createAnalyticsKpiEventualSuccessQueryKey(
  params?: AnalyticsKpiEventualSuccessQueryParams,
) {
  return [
    "analytics-kpi-eventual-success",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsKpiFirstAttemptSuccessQueryParams = {
  from?: Date;
  to?: Date;
};

export function createAnalyticsKpiFirstAttemptSuccessQueryKey(
  params?: AnalyticsKpiFirstAttemptSuccessQueryParams,
) {
  return [
    "analytics-kpi-first-attempt-success",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
  ] as const;
}

type AnalyticsKpiE2ELatencyQueryParams = {
  from?: Date;
  to?: Date;
};

export function createAnalyticsKpiE2ELatencyQueryKey(
  params?: AnalyticsKpiE2ELatencyQueryParams,
) {
  return [
    "analytics-kpi-e2e-latency",
    params?.from?.toISOString(),
    params?.to?.toISOString(),
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

export function createAnalyticsVolumeQueryKey() {
  return ["analytics-volume"] as const;
}

export function createAnalyticsTerminalQueryKey() {
  return ["analytics-terminal"] as const;
}

export function createAnalyticsSuccessRatesQueryKey() {
  return ["analytics-success-rates"] as const;
}

export function createAnalyticsE2ELatencyQueryKey() {
  return ["analytics-e2e-latency"] as const;
}

export function createAnalyticsSlaBandsQueryKey() {
  return ["analytics-sla-bands"] as const;
}

export function createAnalyticsErrorsQueryKey() {
  return ["analytics-errors"] as const;
}
