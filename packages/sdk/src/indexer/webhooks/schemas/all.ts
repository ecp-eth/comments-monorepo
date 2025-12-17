import { z } from "zod/v3";
import {
  ApprovalAddedEventSchema,
  ApprovalEvents,
  ApprovalRemovedEventSchema,
} from "./approval.js";
import {
  ChannelCreatedEventSchema,
  ChannelEvents,
  ChannelHookStatusUpdatedEventSchema,
  ChannelMetadataSetEventSchema,
  ChannelTransferredEventSchema,
  ChannelUpdatedEventSchema,
} from "./channel.js";
import {
  CommentAddedEventSchema,
  CommentDeletedEventSchema,
  CommentEditedEventSchema,
  CommentEvents,
  CommentHookMetadataSetEventSchema,
  CommentModerationStatusUpdatedEventSchema,
  CommentReactionsUpdatedEventSchema,
  CommentReferencesUpdatedEventSchema,
} from "./comment.js";
import { TestEvents, TestEventSchema } from "./test.js";

/**
 * All events schema.
 */
export const AllEventsSchema = z.union([
  ApprovalAddedEventSchema,
  ApprovalRemovedEventSchema,
  ChannelCreatedEventSchema,
  ChannelHookStatusUpdatedEventSchema,
  ChannelMetadataSetEventSchema,
  ChannelTransferredEventSchema,
  ChannelUpdatedEventSchema,
  CommentAddedEventSchema,
  CommentDeletedEventSchema,
  CommentEditedEventSchema,
  CommentHookMetadataSetEventSchema,
  CommentModerationStatusUpdatedEventSchema,
  CommentReactionsUpdatedEventSchema,
  CommentReferencesUpdatedEventSchema,
  TestEventSchema,
]);

/**
 * All events.
 */
export const AllEvents = [
  ...ApprovalEvents,
  ...ChannelEvents,
  ...CommentEvents,
  ...TestEvents,
] as const;
