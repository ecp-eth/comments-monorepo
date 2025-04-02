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
} from "./schemas/index.js";
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
   * The viewer's address. This is useful when the content moderation is enabled on the indexer.
   */
  viewer?: Hex;
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
   * The cursor to fetch comments from
   */
  cursor?: Hex;
  /**
   * The sort order, either `asc` or `desc`
   *
   * @default "desc"
   */
  sort?: "asc" | "desc";
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
  cursor: HexSchema.optional(),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
  viewer: HexSchema.optional(),
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
    cursor,
    retries,
    sort,
    targetUri,
    appSigner,
    signal,
    viewer,
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
    url.searchParams.set("limit", limit.toString());

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    if (viewer) {
      url.searchParams.set("viewer", viewer);
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
   * The viewer's address. This is useful when the content moderation is enabled on the indexer.
   */
  viewer?: Hex;
  /**
   * URL on which /api/comments/$commentId/replies endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
  /**
   * Filters to only comments sent using this app signer key.
   */
  appSigner?: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * The cursor to fetch comments from
   */
  cursor?: Hex;
  /**
   * @default "desc"
   */
  sort?: "asc" | "desc";
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
  cursor: HexSchema.optional(),
  viewer: HexSchema.optional(),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Fetch replies for a comment from the Indexer API
 *
 * @returns A promise that resolves replies fetched from the Indexer API
 */
export async function fetchCommentReplies(
  options: FetchCommentRepliesOptions
): Promise<IndexerAPIListCommentRepliesSchemaType> {
  const {
    apiUrl,
    commentId,
    limit,
    cursor,
    retries,
    appSigner,
    signal,
    sort,
    viewer,
  } = FetchCommentRepliesOptionSchema.parse(options);

  const fetchRepliesTask = Effect.tryPromise(async (signal) => {
    const url = new URL(`/api/comments/${commentId}/replies`, apiUrl);

    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("sort", sort);

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    if (viewer) {
      url.searchParams.set("viewer", viewer);
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

const isMutedOptionsSchema = z.object({
  address: HexSchema,
  apiUrl: z.string().url().default(INDEXER_API_URL),
  signal: z.instanceof(AbortSignal).optional(),
  retries: z.number().int().positive().default(3),
});

/**
 * The options for `isMuted()`
 */
export type IsMutedOptions = {
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
   * URL on which /api/muted-accounts/$address endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
  signal?: AbortSignal;
};

/**
 * Checks if an address is marked as a muted on the indexer of your choice.
 *
 * @param options - The options for checking if an address is muted
 * @returns A promise that resolves to `true` if the address is marked as muted, `false` otherwise
 */
export async function isMuted(options: IsMutedOptions): Promise<boolean> {
  const { address, apiUrl, retries, signal } =
    isMutedOptionsSchema.parse(options);

  const isMutedTask = Effect.retry(
    Effect.tryPromise(async (signal) => {
      const url = new URL(`/api/muted-accounts/${address}`, apiUrl);

      const response = await fetch(url.toString(), {
        method: "GET",
        signal,
        cache: "no-cache",
      });

      if (response.status === 200) {
        return true;
      }

      if (response.status === 404) {
        return false;
      }

      throw new Error(
        `Failed to check if address is muted: ${response.statusText} (${response.status})`
      );
    }),
    {
      times: retries,
    }
  );

  return Effect.runPromise(isMutedTask, { signal });
}
