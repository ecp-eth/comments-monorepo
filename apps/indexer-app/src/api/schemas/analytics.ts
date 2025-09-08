import { z } from "zod";

export const AnalyticsKpiDeliveriesResponseSchema = z.object({
  deliveries: z.coerce.number(),
});

export type AnalyticsKpiDeliveriesResponseSchemaType = z.infer<
  typeof AnalyticsKpiDeliveriesResponseSchema
>;

export const AnalyticsKpiEventualSuccessResponseSchema = z.object({
  eventualSuccessRate: z.coerce.number(),
  previousEventualSuccessRate: z.coerce.number(),
  delta: z.coerce.number(),
});

export type AnalyticsKpiEventualSuccessResponseSchemaType = z.infer<
  typeof AnalyticsKpiEventualSuccessResponseSchema
>;

export const AnalyticsKpiFirstAttemptSuccessResponseSchema = z.object({
  firstSuccessRate: z.coerce.number(),
  previousFirstSuccessRate: z.coerce.number(),
  delta: z.coerce.number(),
});

export type AnalyticsKpiFirstAttemptSuccessResponseSchemaType = z.infer<
  typeof AnalyticsKpiFirstAttemptSuccessResponseSchema
>;

export const AnalyticsKpiE2ELatencyResponseSchema = z.object({
  p95: z.coerce.number(),
});

export type AnalyticsKpiE2ELatencyResponseSchemaType = z.infer<
  typeof AnalyticsKpiE2ELatencyResponseSchema
>;

export const AnalyticsKpiBacklogResponseSchema = z.object({
  inProgress: z.coerce.number(),
  pending: z.coerce.number(),
  processing: z.coerce.number(),
  nextDueAt: z.coerce.date().nullable(),
  oldestAgeSec: z.number().int().nonnegative().nullable(),
});

export type AnalyticsKpiBacklogResponseSchemaType = z.infer<
  typeof AnalyticsKpiBacklogResponseSchema
>;

export const AnalyticsKpiDeliveredUnderMinuteResponseSchema = z.object({
  rate: z.coerce.number(),
});

export type AnalyticsKpiDeliveredUnderMinuteResponseSchemaType = z.infer<
  typeof AnalyticsKpiDeliveredUnderMinuteResponseSchema
>;
