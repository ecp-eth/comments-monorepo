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
  | CommentModerationStatusUpdatedEvent;

export type EventTypes = ChannelEvent | ApprovalEvent | CommentEvent;

export type EventOutboxAggregateType = "approval" | "channel" | "comment";
