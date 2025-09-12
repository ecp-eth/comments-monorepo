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
import type {
  CommentAddedEvent,
  CommentHookMetadataSetEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
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
  | CommentEditedEvent;

export type EventTypes = Events["event"];

export type EventOutboxAggregateType = "approval" | "channel" | "comment";
