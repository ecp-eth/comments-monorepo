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

export function createAnalyticsKpiDeliveriesQueryKey() {
  return ["analytics-kpi-deliveries"] as const;
}

export function createAnalyticsKpiEventualSuccessQueryKey() {
  return ["analytics-kpi-eventual-success"] as const;
}

export function createAnalyticsKpiFirstAttemptSuccessQueryKey() {
  return ["analytics-kpi-first-attempt-success"] as const;
}

export function createAnalyticsKpiE2ELatencyQueryKey() {
  return ["analytics-kpi-e2e-latency"] as const;
}

export function createAnalyticsKpiBacklogQueryKey() {
  return ["analytics-kpi-backlog"] as const;
}
