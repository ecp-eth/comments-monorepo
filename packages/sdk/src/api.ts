import { Effect } from "effect";
import type { Hex } from "./types.js";
import {
  IndexerAPIListCommentRepliesSchema,
  type IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchema,
  type IndexerAPIListCommentsSchemaType,
} from "./schemas.js";

/**
 * The options for `fetchComments()`
 */
export type FetchCommentsOptions = {
  targetUri: string;
  /**
   * URL on which /api/comments endpoint will be called
   */
  apiUrl: string;
  /**
   * Filter comments sent using this app signer key.
   */
  appSigner?: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * The sort order, either `asc` or `desc`
   *
   * @default "desc"
   */
  sort?: "asc" | "desc";
  /**
   * The offset of the comments to fetch
   *
   * @default 0
   */
  offset?: number;
  /**
   * The number of comments to fetch
   *
   * @default 50
   */
  limit?: number;
  signal?: AbortSignal;
};

/**
 * Fetch comments from the Embed API
 *
 * @param FetchCommentsResponse
 * @returns A promise that resolves comments fetched from the Embed API
 */
export async function fetchComments({
  apiUrl,
  targetUri,
  appSigner,
  sort = "desc",
  offset = 0,
  limit = 50,
  retries = 3,
  signal,
}: FetchCommentsOptions): Promise<IndexerAPIListCommentsSchemaType> {
  const fetchCommentsTask = Effect.tryPromise(async (signal) => {
    const url = new URL("/api/comments", apiUrl);
    url.searchParams.set("targetUri", targetUri);
    url.searchParams.set("sort", sort);
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-cache",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    const responseData = await response.json();

    return IndexerAPIListCommentsSchema.parse(responseData);
  });

  const repeatableTask = Effect.retry(fetchCommentsTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask, { signal });
}

/**
 * The options for `fetchCommentReplies()`
 */
export type FetchCommentRepliesOptions = {
  /**
   * The ID of the comment to fetch replies for
   */
  commentId: Hex;
  /**
   * URL on which /api/comments/$commentId/replies endpoint will be called
   */
  apiUrl: string;
  /**
   * Filters only to comments sent using this app signer key.
   */
  appSigner?: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
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
  signal?: AbortSignal;
};

/**
 * Fetch replies for a comment from the Embed API
 *
 * @param FetchCommentRepliesOptions
 * @returns A promise that resolves replies fetched from the Embed API
 */
export async function fetchCommentReplies({
  apiUrl,
  appSigner,
  commentId,
  retries = 3,
  offset = 0,
  limit = 50,
  signal,
}: FetchCommentRepliesOptions): Promise<IndexerAPIListCommentRepliesSchemaType> {
  const fetchRepliesTask = Effect.tryPromise(async (signal) => {
    const url = new URL(`/api/comments/${commentId}/replies`, apiUrl);

    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-cache",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch replies: ${response.statusText}`);
    }

    const responseData = await response.json();

    return IndexerAPIListCommentRepliesSchema.parse(responseData);
  });

  const repeatableTask = Effect.retry(fetchRepliesTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask, { signal });
}
