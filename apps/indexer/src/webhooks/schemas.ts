import { z } from "zod";

export const WebhookAuthConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("http-basic-aut"),
    headerName: z.string().default("Authorization"),
    username: z.string(),
    password: z.string(),
  }),
  z.object({
    type: z.literal("header"),
    headerName: z.string().default("Authorization"),
    headerValue: z.string(),
  }),
  z.object({
    type: z.literal("no-auth"),
  }),
]);

export type WebhookAuthConfig = z.infer<typeof WebhookAuthConfigSchema>;
