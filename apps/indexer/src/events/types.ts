import type {
  ChannelCreatedEvent,
  ChannelUpdatedEvent,
  ChannelHookStatusUpdatedEvent,
  ChannelMetadataSetEvent,
  ChannelTransferEvent,
  ChannelEvent,
} from "./channel/schemas.ts";
import type {
  ApprovalAddedEvent,
  ApprovalRemovedEvent,
  ApprovalEvent,
} from "./approval/schemas.ts";
import type {
  CommentAddedEvent,
  CommentHookMetadataSetEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentModerationStatusUpdatedEvent,
  CommentEvent,
  CommentReactionsUpdatedEvent,
  CommentReferencesUpdatedEvent,
} from "./comment/schemas.ts";
import type { TestEvent } from "./test/schemas.ts";

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
  | CommentReactionsUpdatedEvent
  | CommentReferencesUpdatedEvent
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
