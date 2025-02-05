import { Effect } from "effect";
import type { APICommentsResponse, Hex } from "./types.js";

type PublicClientOptions = {
  /**
   * The URL of the indexer to use for fetching comments and replies
   */
  indexerUrl: string;
};

type GetCommentsOptions = {
  /**
   * The number of times to retry the request in case of failure
   *
   * @default 3
   */
  retries?: number;
};

type GetCommentRepliesOptions = {
  /**
   * @default "desc"
   */
  sort?: "asc" | "desc";
  /**
   *
   * @default 0
   */
  offset?: number;
  /**
   * @default 50
   */
  limit?: number;
  /**
   * The number of times to retry the request in case of failure
   *
   * @default 3
   */
  retries?: number;
};

/**
 * A public client for fetching comments and replies
 */
export class PublicClient {
  constructor(public options: PublicClientOptions) {}

  /**
   * Fetch comments for a given target URL
   */
  async getComments(
    targetUrl: string,
    { retries = 3 }: GetCommentsOptions = {}
  ): Promise<APICommentsResponse> {
    const url = new URL("/api/comments", this.options.indexerUrl);
    url.searchParams.append("targetUrl", targetUrl);

    const fetchResponseTask = Effect.tryPromise(async () => {
      const response = await Effect.runPromise(
        Effect.tryPromise({
          try: () => fetch(url, { method: "GET" }),
          catch(error) {
            throw new Error(`Failed to fetch comments: ${error}`);
          },
        })
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await Effect.runPromise(
        Effect.tryPromise({
          try: () => response.json() as Promise<APICommentsResponse>,
          catch(error) {
            throw new Error(`Failed to parse response as json: ${error}`);
          },
        })
      );

      return data;
    });

    const repeatedFetchResponseTask = Effect.retry(fetchResponseTask, {
      times: retries,
    });

    return Effect.runPromise(repeatedFetchResponseTask);
  }

  /**
   * Fetch replies for a given comment
   */
  async getCommentReplies(
    commentId: Hex,
    {
      retries = 3,
      offset = 0,
      limit = 50,
      sort = "desc",
    }: GetCommentRepliesOptions = {}
  ): Promise<APICommentsResponse> {
    const url = new URL(
      `/api/comments/${commentId}/replies`,
      this.options.indexerUrl
    );

    url.searchParams.append("offset", offset.toString());
    url.searchParams.append("limit", limit.toString());
    url.searchParams.append("sort", sort);

    const fetchResponseTask = Effect.tryPromise(async () => {
      const response = await Effect.runPromise(
        Effect.tryPromise({
          try: () => fetch(url, { method: "GET" }),
          catch(error) {
            throw new Error(`Failed to fetch comments: ${error}`);
          },
        })
      );

      if (response.status === 404) {
        throw new Error("Comment not found");
      }

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await Effect.runPromise(
        Effect.tryPromise({
          try: () => response.json() as Promise<APICommentsResponse>,
          catch(error) {
            throw new Error(`Failed to parse response as json: ${error}`);
          },
        })
      );

      return data;
    });

    const repeatedFetchResponseTask = Effect.retry(fetchResponseTask, {
      times: retries,
    });

    return Effect.runPromise(repeatedFetchResponseTask);
  }
}

/**
 * Creates a new public client
 */
export function createPublicClient(options: PublicClientOptions): PublicClient {
  return new PublicClient(options);
}
