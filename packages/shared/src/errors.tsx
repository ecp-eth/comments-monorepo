import { type ReactNode } from "react";

export class CommentFormSubmitError extends Error {
  constructor(private error: ReactNode) {
    super();
  }

  render() {
    return this.error;
  }
}

export class InvalidCommentError extends CommentFormSubmitError {
  constructor(errors: Record<string, string[]>) {
    const errorMessages = Object.entries(errors).map(function ([
      field,
      messages,
    ]) {
      return (
        <span className="inline-flex gap-1" key={field}>
          <strong>{field}: </strong>
          {messages.map((message) => (
            <span key={message}>{message}</span>
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

export class CommentContentTooLargeError extends CommentFormSubmitError {
  constructor(message = "Comment content length limit exceeded") {
    super(<span className="inline-flex">{message}</span>);
  }
}

/**
 * Throws an error based on the known response status codes
 * if the code is not known, it will not throw an error
 *
 * @param response - The response to throw an error for
 */
export const throwKnownResponseCodeError = async (response: Response) => {
  if (response.status === 429) {
    throw new RateLimitedError();
  }

  if (response.status === 400) {
    throw new CommentFormSubmitError(await response.json());
  }

  if (response.status === 413) {
    throw new CommentContentTooLargeError();
  }
};
