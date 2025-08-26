import { randomUUID } from "node:crypto";
import { type TestEvent, TestEventSchema } from "./schemas";

export function ponderEventToTestEvent(): TestEvent {
  return TestEventSchema.parse({
    event: "test",
    uid: `test:${Date.now()}:${randomUUID()}`,
    version: 1,
    data: {
      message: "Test event from ECP indexer",
    },
  });
}
