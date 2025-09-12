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
  p95: z.object({
    firstAttempt: z.coerce.number(),
    firstSuccess: z.coerce.number(),
  }),
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

export const AnalyticsVolumeResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      attempts: z.coerce.number(),
      successes: z.coerce.number(),
      failures: z.coerce.number(),
      transport: z.coerce.number(),
      http4xx: z.coerce.number(),
      http5xx: z.coerce.number(),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsVolumeResponseSchemaType = z.infer<
  typeof AnalyticsVolumeResponseSchema
>;

export const AnalyticsTerminalResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      deliveries: z.coerce.number(),
      successes: z.coerce.number(),
      failures: z.coerce.number(),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsTerminalResponseSchemaType = z.infer<
  typeof AnalyticsTerminalResponseSchema
>;

export const AnalyticsSuccessRatesResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      eventualSuccessRate: z.coerce.number(),
      firstSuccessRate: z.coerce.number(),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsSuccessRatesResponseSchemaType = z.infer<
  typeof AnalyticsSuccessRatesResponseSchema
>;

export const AnalyticsE2ELatencyResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      latencies: z.object({
        p50: z.coerce.number(),
        p90: z.coerce.number(),
        p95: z.coerce.number(),
        p99: z.coerce.number(),
      }),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsE2ELatencyResponseSchemaType = z.infer<
  typeof AnalyticsE2ELatencyResponseSchema
>;

export const AnalyticsSlaBandsResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      bands: z.object({
        "10s": z.coerce.number(),
        "30s": z.coerce.number(),
        "60s": z.coerce.number(),
        "300s": z.coerce.number(),
      }),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsSlaBandsResponseSchemaType = z.infer<
  typeof AnalyticsSlaBandsResponseSchema
>;

export const AnalyticsErrorsResponseSchema = z.object({
  results: z.array(
    z.object({
      time: z.coerce.date(),
      http4xx: z.coerce.number(),
      http5xx: z.coerce.number(),
      timeout: z.coerce.number(),
      other: z.coerce.number(),
    }),
  ),
  info: z.object({
    bucket: z.enum(["hour", "day", "week", "month"]),
    from: z.coerce.date(),
    to: z.coerce.date(),
  }),
});

export type AnalyticsErrorsResponseSchemaType = z.infer<
  typeof AnalyticsErrorsResponseSchema
>;
