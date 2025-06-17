import { Effect } from "effect";
import { HexSchema, type Hex } from "../core/schemas.js";
import {
  IndexerAPIListCommentRepliesSchema,
  type IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchema,
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  IndexerAPIAuthorDataSchema,
  IndexerAPICommentModerationStatusSchema,
  type IndexerAPICommentModerationStatusSchemaType,
  type IndexerAPICommentListModeSchemaType,
  IndexerAPICommentListModeSchema,
  IndexerAPISortSchema,
  type IndexerAPISortSchemaType,
  IndexerAPIListChannelsSchema,
  type IndexerAPIListChannelsSchemaType,
} from "./schemas.js";
import { INDEXER_API_URL } from "../constants.js";
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
  app?: Hex;
  /**
   * Filter comments by channel ID
   */
  channelId?: bigint;
  /**
   * Filter comments by comment type
   */
  commentType?: number;
  /**
   * Filter comments by moderation status.
   *
   * By default API returns only approved comments if moderation is enabled for all comments except
   * when the viewer is provided, for viewer it returns all comments regardless of status.
   *
   * If moderation is disabled, this parameter is ignored.
   */
  moderationStatus?:
    | IndexerAPICommentModerationStatusSchemaType
    | IndexerAPICommentModerationStatusSchemaType[];
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
  sort?: IndexerAPISortSchemaType;
  /**
   * The mode to fetch comments in by default it returns only the first level of comments.
   * If flat is used it will return all comments sorted by timestamp in descending order.
   *
   * @default "nested"
   */
  mode?: IndexerAPICommentListModeSchemaType;
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
  app: HexSchema.optional(),
  channelId: z.coerce.bigint().optional(),
  commentType: z.number().int().min(0).max(255).optional(),
  moderationStatus: IndexerAPICommentModerationStatusSchema.or(
    z.array(IndexerAPICommentModerationStatusSchema),
  ).optional(),
  retries: z.number().int().positive().default(3),
  sort: IndexerAPISortSchema.default("desc"),
  cursor: HexSchema.optional(),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
  mode: IndexerAPICommentListModeSchema.optional(),
  viewer: HexSchema.optional(),
});

/**
 * Fetch comments from the Indexer API
 *
 * @returns A promise that resolves comments fetched from the Indexer API
 */
export async function fetchComments(
  options: FetchCommentsOptions,
): Promise<IndexerAPIListCommentsSchemaType> {
  const {
    apiUrl,
    author,
    limit,
    cursor,
    retries,
    sort,
    targetUri,
    app,
    signal,
    viewer,
    mode,
    channelId,
    commentType,
    moderationStatus,
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

    if (app) {
      url.searchParams.set("app", app);
    }

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    if (viewer) {
      url.searchParams.set("viewer", viewer);
    }

    if (mode) {
      url.searchParams.set("mode", mode);
    }

    if (channelId) {
      url.searchParams.set("channelId", channelId.toString());
    }

    if (commentType) {
      url.searchParams.set("commentType", commentType.toString());
    }

    if (typeof moderationStatus === "string") {
      url.searchParams.set("moderationStatus", moderationStatus);
    } else if (Array.isArray(moderationStatus) && moderationStatus.length > 0) {
      url.searchParams.set("moderationStatus", moderationStatus.join(","));
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
  app?: Hex;
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
  sort?: IndexerAPISortSchemaType;
  /**
   * The mode to fetch replies in by default it returns only the first level of replies.
   * If flat is used it will return all replies sorted by timestamp in descending order.
   *
   * @default "nested"
   */
  mode?: IndexerAPICommentListModeSchemaType;
  /**
   * Filter replies by comment type
   */
  commentType?: number;
  /**
   * Filter replies by moderation status.
   *
   * By default API returns only approved comments if moderation is enabled for all comments except
   * when the viewer is provided, for viewer it returns all comments regardless of status.
   *
   * If moderation is disabled, this parameter is ignored.
   */
  moderationStatus?:
    | IndexerAPICommentModerationStatusSchemaType
    | IndexerAPICommentModerationStatusSchemaType[];
  /**
   * Filter replies by channel ID
   */
  channelId?: bigint;
  /**
   * @default 50
   */
  limit?: number;
  signal?: AbortSignal;
};

const FetchCommentRepliesOptionSchema = z.object({
  commentId: HexSchema,
  apiUrl: z.string().url().default(INDEXER_API_URL),
  app: HexSchema.optional(),
  retries: z.number().int().positive().default(3),
  cursor: HexSchema.optional(),
  viewer: HexSchema.optional(),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
  sort: IndexerAPISortSchema.default("desc"),
  mode: IndexerAPICommentListModeSchema.optional(),
  commentType: z.number().int().min(0).max(255).optional(),
  channelId: z.coerce.bigint().optional(),
  moderationStatus: IndexerAPICommentModerationStatusSchema.or(
    z.array(IndexerAPICommentModerationStatusSchema),
  ).optional(),
});

/**
 * Fetch replies for a comment from the Indexer API
 *
 * @returns A promise that resolves replies fetched from the Indexer API
 */
export async function fetchCommentReplies(
  options: FetchCommentRepliesOptions,
): Promise<IndexerAPIListCommentRepliesSchemaType> {
  const {
    apiUrl,
    commentId,
    limit,
    cursor,
    retries,
    app,
    signal,
    sort,
    viewer,
    mode,
    commentType,
    channelId,
    moderationStatus,
  } = FetchCommentRepliesOptionSchema.parse(options);

  const fetchRepliesTask = Effect.tryPromise(async (signal) => {
    const url = new URL(`/api/comments/${commentId}/replies`, apiUrl);

    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("sort", sort);

    if (app) {
      url.searchParams.set("app", app);
    }

    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    if (viewer) {
      url.searchParams.set("viewer", viewer);
    }

    if (mode) {
      url.searchParams.set("mode", mode);
    }

    if (channelId) {
      url.searchParams.set("channelId", channelId.toString());
    }

    if (commentType) {
      url.searchParams.set("commentType", commentType.toString());
    }

    if (typeof moderationStatus === "string") {
      url.searchParams.set("moderationStatus", moderationStatus);
    } else if (Array.isArray(moderationStatus) && moderationStatus.length > 0) {
      url.searchParams.set("moderationStatus", moderationStatus.join(","));
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
  options: FetchAuthorDataOptions,
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

/**
 * The options for `isMuted()`
 */
const isMutedOptionsSchema = z.object({
  /**
   * Author's address
   */
  address: HexSchema,
  /**
   * URL on which /api/muted-accounts/$address endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl: z.string().url().default(INDEXER_API_URL),
  /**
   * Abort signal for requests
   */
  signal: z.instanceof(AbortSignal).optional(),
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries: z.number().int().positive().default(3),
});

/**
 * The options for `isMuted()`
 */
export type IsMutedOptions = z.input<typeof isMutedOptionsSchema>;

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
        `Failed to check if address is muted: ${response.statusText} (${response.status})`,
      );
    }),
    {
      times: retries,
    },
  );

  return Effect.runPromise(isMutedTask, { signal });
}

/**
 * The options for `fetchChannels()`
 */
export type FetchChannelsOptions = {
  /**
   * URL on which /api/channels endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * The cursor to fetch channels from
   */
  cursor?: Hex;
  /**
   * The sort order, either `asc` or `desc`
   *
   * @default "desc"
   */
  sort?: IndexerAPISortSchemaType;
  /**
   * The number of channels to fetch
   *
   * @default 50
   */
  limit?: number;
  signal?: AbortSignal;
};

const FetchChannelsOptionsSchema = z.object({
  apiUrl: z.string().url().default(INDEXER_API_URL),
  retries: z.number().int().positive().default(3),
  cursor: HexSchema.optional(),
  sort: IndexerAPISortSchema.default("desc"),
  limit: z.number().int().positive().default(50),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch channels from the Indexer API
 *
 * @returns A promise that resolves channels fetched from the Indexer API
 */
export async function fetchChannels(
  options: FetchChannelsOptions,
): Promise<IndexerAPIListChannelsSchemaType> {
  const { apiUrl, limit, cursor, retries, sort, signal } =
    FetchChannelsOptionsSchema.parse(options);

  const fetchChannelsTask = Effect.tryPromise(async (signal) => {
    const url = new URL("/api/channels", apiUrl);

    url.searchParams.set("sort", sort);
    url.searchParams.set("limit", limit.toString());

    if (cursor) {
      url.searchParams.set("cursor", cursor);
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
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }

    const responseData = await response.json();

    return IndexerAPIListChannelsSchema.parse(responseData);
  });

  const repeatableTask = Effect.retry(fetchChannelsTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask, { signal });
}
