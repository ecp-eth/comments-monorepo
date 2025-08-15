import { CommentFormSubmitError } from "@ecp.eth/shared/errors";

export class SubmitCommentMutationError extends CommentFormSubmitError {}

export class ChannelNotFoundError extends Error {
  constructor() {
    super("Channel not found");
    this.name = "ChannelNotFoundError";
  }
}

export class SignCommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SignCommentError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
