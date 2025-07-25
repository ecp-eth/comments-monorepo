import { z } from "@hono/zod-openapi";

export const BadRequestResponse = z.object({
  error: z.string(),
});

export const InternalServerErrorResponse = z.object({
  error: z.string(),
});

export const NotFoundResponse = z.object({
  error: z.string(),
});

export const UnsupportedMediaTypeResponse = z.object({
  error: z.string(),
});

export const ChannelResponse = z.object({
  id: z.bigint().transform((val) => val.toString()),
  name: z.string(),
  description: z.string(),
  createdAt: z.date().transform((val) => val.toISOString()),
  updatedAt: z.date().transform((val) => val.toISOString()),
  isSubscribed: z.boolean(),
  notificationsEnabled: z.boolean(),
});

export const ChannelSubscriptionUpdateResponse = z.object({
  channelId: z.bigint().transform((val) => val.toString()),
  notificationsEnabled: z.boolean(),
});
