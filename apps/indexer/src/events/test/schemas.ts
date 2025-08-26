import { z } from "zod";

export const TestEvents = ["test"] as const;

export const TestEventSchema = z.object({
  event: z.literal("test"),
  uid: z.string(),
  version: z.literal(1),
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
  data: z.object({
    message: z.string(),
  }),
});

export type TestEventInput = z.input<typeof TestEventSchema>;

export type TestEvent = z.infer<typeof TestEventSchema>;
