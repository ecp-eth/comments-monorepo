import { z } from "zod";

export const AnalyticsKpiDeliveriesResponseSchema = z.object({
  deliveries: z.coerce.bigint(),
});

export type AnalyticsKpiDeliveriesResponseSchemaType = z.infer<
  typeof AnalyticsKpiDeliveriesResponseSchema
>;
