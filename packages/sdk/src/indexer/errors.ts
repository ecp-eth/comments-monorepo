/**
 * An error thrown when a response from the indexer is not successful.
 */
export class ResponseError extends Error {
  constructor(
    message: string,
    public readonly response: Response,
  ) {
    super(message);

    this.name = "ResponseError";
  }
}
