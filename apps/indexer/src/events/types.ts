import type {
  ChannelCreatedEvent,
  ChannelUpdatedEvent,
  ChannelHookStatusUpdatedEvent,
  ChannelMetadataSetEvent,
  ChannelTransferEvent,
} from "./channel/schemas";
import type {
  ApprovalAddedEvent,
  ApprovalRemovedEvent,
} from "./approval/schemas";

export type Events =
  | ChannelCreatedEvent
  | ChannelUpdatedEvent
  | ChannelHookStatusUpdatedEvent
  | ChannelMetadataSetEvent
  | ChannelTransferEvent
  | ApprovalAddedEvent
  | ApprovalRemovedEvent;

export type EventTypes = Events["event"];

export type EventOutboxAggregateType = "approval" | "channel";
