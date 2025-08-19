import { HexSchema } from "@ecp.eth/sdk/core";
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

export const ChannelResponse = z.object({
  id: z.bigint().transform((val) => val.toString()),
  chainId: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  owner: HexSchema,
  createdAt: z.date().transform((val) => val.toISOString()),
  updatedAt: z.date().transform((val) => val.toISOString()),
  isSubscribed: z.boolean(),
  notificationSettings: z.record(z.number().int(), z.boolean()),
});

export const ChannelSubscriptionUpdateResponse = z.object({
  channelId: z.bigint().transform((val) => val.toString()),
  notificationsEnabled: z.boolean(),
});

export const FarcasterSettingsUpdateResponse = z.object({
  userFid: z.number(),
  notificationsEnabled: z.boolean(),
});
