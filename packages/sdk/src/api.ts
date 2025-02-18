import { Effect } from "effect";
import type { FetchCommentsResponse, Hex } from "./types.js";

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
}: FetchCommentsOptions): Promise<FetchCommentsResponse> {
  const fetchCommentsTask = Effect.tryPromise(async () => {
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
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    const responseData: FetchCommentsResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchCommentsTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

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
}: FetchCommentRepliesOptions): Promise<FetchCommentsResponse> {
  const fetchRepliesTask = Effect.tryPromise(async () => {
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
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch replies: ${response.statusText}`);
    }

    const responseData: FetchCommentsResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchRepliesTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}
