import { CommentFormSubmitError } from "@ecp.eth/shared/errors";

export class SubmitCommentMutationError extends CommentFormSubmitError {}

export class ChannelNotFoundError extends Error {
  constructor() {
    super("Channel not found");
    this.name = "ChannelNotFoundError";
  }
}
