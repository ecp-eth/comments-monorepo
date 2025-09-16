import { randomUUID } from "node:crypto";
import { type TestEvent, TestEventSchema } from "./schemas.ts";

export function createTestEvent({
  appId,
  webhookId,
}: {
  appId: string;
  webhookId: string;
}): TestEvent {
  return TestEventSchema.parse({
    event: "test",
    uid: `test:${Date.now()}:${randomUUID()}`,
    version: 1,
    appId,
    webhookId,
    data: {
      message: "Test event from ECP indexer",
    },
  });
}
