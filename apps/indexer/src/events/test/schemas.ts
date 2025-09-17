import { z } from "zod";
import {
  EVENT_TEST,
  type TestEventSchema as OutputTestEventSchema,
  type TestEvents as SDKTestEvents,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";

export const TestEvents = [EVENT_TEST] as const;

export const TestEventSchema = z.object({
  event: z.literal(EVENT_TEST),
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

// assert that the schema output is the same as input to sdk
({}) as unknown as TestEvent satisfies z.input<typeof OutputTestEventSchema>;
({}) as unknown as typeof SDKTestEvents satisfies typeof TestEvents;
