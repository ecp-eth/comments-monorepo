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
