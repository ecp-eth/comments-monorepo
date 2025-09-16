import { z } from "@hono/zod-openapi";

const MAX_BINS = 168; // 7 days in hour buckets or 24 weeks in week buckets,...

export const AnalyticsQueryParamsSchema = z
  .object({
    from: z.coerce.date().min(new Date("2025-01-01")).optional(),
    to: z.coerce.date().optional(),
    bucket: z.enum(["hour", "day", "week", "month"]).default("day"),
    appId: z.string().uuid().optional(),
    webhookId: z.string().uuid().optional(),
  })
  .transform((data, ctx) => {
    if (data.from && data.to && data.from >= data.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From date must be before to date",
        path: ["from"],
      });

      return z.NEVER;
    }

    const to = data.to ?? new Date();
    const from = data.from ?? new Date(to.getTime() - 1000 * 60 * 60 * 24 * 7);
    const difference = to.getTime() - from.getTime();
    let computedBins = Number.MAX_SAFE_INTEGER;
    const hourInMs = 1000 * 60 * 60;

    if (data.bucket === "hour") {
      computedBins = Math.floor(difference / hourInMs);
    } else if (data.bucket === "day") {
      computedBins = Math.floor(difference / (24 * hourInMs));
    } else if (data.bucket === "week") {
      computedBins = Math.floor(difference / (7 * 24 * hourInMs));
    } else if (data.bucket === "month") {
      computedBins = Math.floor(difference / (30 * 24 * hourInMs));
    }

    computedBins += 1;

    if (computedBins > MAX_BINS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Range is too large, use larger bucket or smaller range",
        path: ["from"],
      });

      return z.NEVER;
    }

    return {
      ...data,
      from,
      to,
      originForBucket: data.bucket === "week" ? "1970-01-05" : "1970-01-01", // compute weeks from monday (ISO)
    };
  });
