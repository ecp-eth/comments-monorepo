import { Effect } from "effect";
import {
  HexSchema,
  type Hex,
  IndexerAPIListCommentRepliesSchema,
  type IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchema,
  type IndexerAPIListCommentsSchemaType,
} from "./schemas.js";
import { INDEXER_API_URL } from "./constants.js";
import { z } from "zod";

/**
 * The options for `fetchComments()`
 */
export type FetchCommentsOptions = {
  targetUri: string;
  /**
   * URL on which /api/comments endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
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

const FetchCommentsOptionsSchema = z.object({
  targetUri: z.string().url(),
  apiUrl: z.string().url().default(INDEXER_API_URL),
  appSigner: HexSchema.optional(),
  retries: z.number().int().positive().default(3),
  sort: z.enum(["asc", "desc"]).default("desc"),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch comments from the Indexer API
 *
 * @returns A promise that resolves comments fetched from the Indexer API
 */
export async function fetchComments(
  options: FetchCommentsOptions
): Promise<IndexerAPIListCommentsSchemaType> {
  const { apiUrl, limit, offset, retries, sort, targetUri, appSigner, signal } =
    FetchCommentsOptionsSchema.parse(options);

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
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
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

const FetchCommentRepliesOptionSchema = z.object({
  commentId: HexSchema,
  apiUrl: z.string().url().default(INDEXER_API_URL),
  appSigner: HexSchema.optional(),
  retries: z.number().int().positive().default(3),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch replies for a comment from the Indexer API
 *
 * @returns A promise that resolves replies fetched from the Indexer API
 */
export async function fetchCommentReplies(
  options: FetchCommentRepliesOptions
): Promise<IndexerAPIListCommentRepliesSchemaType> {
  const { apiUrl, commentId, limit, offset, retries, appSigner, signal } =
    FetchCommentRepliesOptionSchema.parse(options);

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
