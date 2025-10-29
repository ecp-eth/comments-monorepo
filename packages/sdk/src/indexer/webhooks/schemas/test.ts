import { z } from "zod/v3";
import { EventV1Schema } from "./shared.js";

export const EVENT_TEST = "test" as const;

/**
 * Test events.
 */
export const TestEvents = [EVENT_TEST] as const;

/**
 * An event sent to webhook when a test event is triggered.
 */
export const TestEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_TEST),
    /**
     * App ID
     */
    appId: z.string().uuid(),
    /**
     * Webhook ID
     */
    webhookId: z.string().uuid(),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Message
       */
      message: z.string(),
    }),
  })
  .merge(EventV1Schema);

export type TestEvent = z.infer<typeof TestEventSchema>;
