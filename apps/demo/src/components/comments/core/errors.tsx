import { BadRequestResponseSchema } from "@/lib/schemas";
import { type ReactNode } from "react";
import { z } from "zod";

export class CommentFormSubmitError extends Error {
  constructor(private error: ReactNode) {
    super();
  }

  render() {
    return this.error;
  }
}

export class InvalidCommentError extends CommentFormSubmitError {
  constructor(errors: z.infer<typeof BadRequestResponseSchema>) {
    const errorMessages = Object.entries(errors).map(function ([
      field,
      messages,
    ]) {
      return (
        <span className="inline-flex gap-1" key={field}>
          <strong>{field}: </strong>
          {messages.map((message, index) => (
            <span key={`${field}-${index}`}>{message}</span>
          ))}
        </span>
      );
    });

    super(errorMessages);
  }
}

export class RateLimitedError extends CommentFormSubmitError {
  constructor(message = "You are posting too frequently") {
    super(<span className="inline-flex">{message}</span>);
  }
}
