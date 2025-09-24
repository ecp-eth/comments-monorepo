export class AppNotFoundError extends Error {
  constructor() {
    super("App not found");
    this.name = "AppNotFoundError";
  }
}

export class WebhookNotFoundError extends Error {
  constructor() {
    super("Webhook not found");
    this.name = "WebhookNotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * This is just error wrapper that can be used to dinstinguish between errors
 * which we want to show in toast with the provided message.
 */
export class KnownMutationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "KnownMutationError";
  }
}
