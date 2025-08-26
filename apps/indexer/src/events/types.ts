import type {
  ChannelCreatedEvent,
  ChannelUpdatedEvent,
  ChannelHookStatusUpdatedEvent,
  ChannelMetadataSetEvent,
  ChannelTransferEvent,
  ChannelEvent,
} from "./channel/schemas";
import type {
  ApprovalAddedEvent,
  ApprovalRemovedEvent,
  ApprovalEvent,
} from "./approval/schemas";
import type {
  CommentAddedEvent,
  CommentHookMetadataSetEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentModerationStatusUpdatedEvent,
  CommentEvent,
} from "./comment/schemas";
import type { TestEvent } from "./test/schemas";

export type Events =
  | ChannelCreatedEvent
  | ChannelUpdatedEvent
  | ChannelHookStatusUpdatedEvent
  | ChannelMetadataSetEvent
  | ChannelTransferEvent
  | ApprovalAddedEvent
  | ApprovalRemovedEvent
  | CommentAddedEvent
  | CommentHookMetadataSetEvent
  | CommentDeletedEvent
  | CommentEditedEvent
  | CommentModerationStatusUpdatedEvent
  | TestEvent;

export type EventTypes =
  | ChannelEvent
  | ApprovalEvent
  | CommentEvent
  | TestEvent["event"];

export type EventOutboxAggregateType =
  | "approval"
  | "app-webhook"
  | "channel"
  | "comment";
