import { z } from "zod";

export const AnalyticsKpiDeliveriesResponseSchema = z.object({
  deliveries: z.coerce.bigint(),
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
