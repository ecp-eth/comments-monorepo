import { z } from "zod";
import {
  ApprovalAddedEventSchema,
  ApprovalRemovedEventSchema,
} from "./approval.js";
import {
  ChannelCreatedEventSchema,
  ChannelHookStatusUpdatedEventSchema,
  ChannelMetadataSetEventSchema,
  ChannelTransferredEventSchema,
  ChannelUpdatedEventSchema,
} from "./channel.js";
import {
  CommentAddedEventSchema,
  CommentDeletedEventSchema,
  CommentEditedEventSchema,
  CommentHookMetadataSetEventSchema,
  CommentModerationStatusUpdatedEventSchema,
  CommentReactionsUpdatedEventSchema,
  CommentReferencesUpdatedEventSchema,
} from "./comment.js";
import { TestEventSchema } from "./test.js";

/**
 * All events schema.
 */
export const AllEventsSchema = z.discriminatedUnion("event", [
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
