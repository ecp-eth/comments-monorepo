import { Effect } from "effect";
import {
  HexSchema,
  type Hex,
  IndexerAPIListCommentRepliesSchema,
  type IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchema,
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  IndexerAPIAuthorDataSchema,
} from "./schemas.js";
import { INDEXER_API_URL } from "./constants.js";
import { z } from "zod";

/**
 * The options for `fetchComments()`
 */
export type FetchCommentsOptions = {
  /**
   * The target URI to fetch comments for
   */
  targetUri?: string;
  /**
   * Filter comments by author
   */
  author?: Hex;
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
  targetUri: z.string().url().optional(),
  author: HexSchema.optional(),
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
  const {
    apiUrl,
    author,
    limit,
    offset,
    retries,
    sort,
    targetUri,
    appSigner,
    signal,
  } = FetchCommentsOptionsSchema.parse(options);

  const fetchCommentsTask = Effect.tryPromise(async (signal) => {
    const url = new URL("/api/comments", apiUrl);

    if (targetUri) {
      url.searchParams.set("targetUri", targetUri);
    }

    if (author) {
      url.searchParams.set("author", author);
    }

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

/**
 * The options for `fetchAuthorData()`
 */
export type FetchAuthorDataOptions = {
  /**
   * Author's address
   */
  address: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * URL on which /api/authors/$address endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
  signal?: AbortSignal;
};

const FetchAuthorDataOptionsSchema = z.object({
  address: HexSchema,
  retries: z.number().int().positive().default(3),
  apiUrl: z.string().url().default(INDEXER_API_URL),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch author data from the Indexer API
 *
 * @returns A promise that resolves author data fetched from the Indexer API
 */
export async function fetchAuthorData(
  options: FetchAuthorDataOptions
): Promise<IndexerAPIAuthorDataSchemaType> {
  const { address, retries, apiUrl, signal } =
    FetchAuthorDataOptionsSchema.parse(options);

  const fetchAuthorTask = Effect.tryPromise(async (signal) => {
    const url = new URL(`/api/authors/${address}`, apiUrl);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-cache",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch author data: ${response.statusText}`);
    }

    const responseData = await response.json();

    return IndexerAPIAuthorDataSchema.parse(responseData);
  });

  const repeatableTask = Effect.retry(fetchAuthorTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask, { signal });
}
