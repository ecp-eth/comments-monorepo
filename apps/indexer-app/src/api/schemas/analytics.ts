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
