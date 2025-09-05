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
