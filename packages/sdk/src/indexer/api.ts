import { runAsync } from "../core/utils.js";
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
  IndexerAPIChannelOutputSchema,
  type IndexerAPIChannelOutputSchemaType,
  IndexerAPIGetAutocompleteOutputSchema,
  type IndexerAPIGetAutocompleteOutputSchemaType,
  IndexerAPIModerationClassificationLabelSchema,
  IndexerAPIModerationClassificationLabelSchemaType,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPICommentWithRepliesSchemaType,
} from "./schemas.js";
import { INDEXER_API_URL } from "../constants.js";
import { z } from "zod";

const FetchCommentOptionsSchema = z.object({
  /**
   * The ID of the comment to fetch
   */
  commentId: HexSchema,
  /**
   * Filter comments by chain ID(s)
   */
  chainId: z.union([z.number().int(), z.array(z.number().int())]),
  /**
   * Filter comments by comment type
   */
  commentType: z.number().int().min(0).max(255).optional(),
  /**
   * The mode to fetch comments in by default it returns only the first level of comments.
   * If flat is used it will return all comments sorted by timestamp in descending order.
   *
   * @default "nested"
   */
  mode: IndexerAPICommentListModeSchema.optional(),
  /**
   * The viewer's address. This is useful when the content moderation is enabled on the indexer.
   */
  viewer: HexSchema.optional(),
  /**
   * URL on which /api/comments endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl: z.string().url().default(INDEXER_API_URL),
  /**
   * The signal to abort the request
   */
  signal: z.instanceof(AbortSignal).optional(),
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries: z.number().int().positive().default(3),
});

export type FetchCommentOptions = z.input<typeof FetchCommentOptionsSchema>;

/**
 * Fetch one single comment from the Indexer API
 *
 * @returns A promise that resolves the comment fetched from the Indexer API
 */
export async function fetchComment(
  options: FetchCommentOptions,
): Promise<IndexerAPICommentWithRepliesSchemaType> {
  const {
    commentId,
    chainId,
    viewer,
    mode,
    commentType,
    apiUrl,
    signal,
    retries,
  } = FetchCommentOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL(`/api/comments/${commentId}`, apiUrl);

      if (Array.isArray(chainId)) {
        url.searchParams.set("chainId", chainId.join(","));
      } else {
        url.searchParams.set("chainId", chainId.toString());
      }

      if (viewer) {
        url.searchParams.set("viewer", viewer);
      }

      if (mode) {
        url.searchParams.set("mode", mode);
      }

      // commentType can be 0
      if (commentType != null) {
        url.searchParams.set("commentType", commentType.toString());
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

      return IndexerAPICommentWithRepliesSchema.parse(responseData);
    },
    { signal, retries },
  );
}

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
   * Filter comments by chain ID(s)
   */
  chainId: number | number[];
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
   * Filter comments by moderation score.
   *
   * Only comments with moderation score lower or equal to the provided value are returned.
   * This can be used to bypass premoderation, make sure to pass all moderation statuses to moderationStatus parameter
   * if the premoderation is enabled.
   */
  moderationScore?: number;
  /**
   * Filter comments by moderation labels.
   *
   * Only comments with moderation labels not included in the provided array are returned.
   * This can be used to bypass premoderation, make sure to pass all moderation statuses to moderationStatus parameter
   * if the premoderation is enabled.
   */
  excludeByModerationLabels?: IndexerAPIModerationClassificationLabelSchemaType[];
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
  chainId: z.union([z.number().int(), z.array(z.number().int())]),
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
  moderationScore: z.coerce.number().min(0).max(1).optional(),
  excludeByModerationLabels: z
    .array(IndexerAPIModerationClassificationLabelSchema)
    .optional(),
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
    chainId,
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
    moderationScore,
    excludeByModerationLabels,
  } = FetchCommentsOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL("/api/comments", apiUrl);

      if (targetUri) {
        url.searchParams.set("targetUri", targetUri);
      }

      if (author) {
        url.searchParams.set("author", author);
      }

      if (Array.isArray(chainId)) {
        url.searchParams.set("chainId", chainId.join(","));
      } else {
        url.searchParams.set("chainId", chainId.toString());
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

      // channelId can be 0
      if (channelId != null) {
        url.searchParams.set("channelId", channelId.toString());
      }

      // commentType can be 0
      if (commentType != null) {
        url.searchParams.set("commentType", commentType.toString());
      }

      if (typeof moderationStatus === "string") {
        url.searchParams.set("moderationStatus", moderationStatus);
      } else if (
        Array.isArray(moderationStatus) &&
        moderationStatus.length > 0
      ) {
        url.searchParams.set("moderationStatus", moderationStatus.join(","));
      }

      if (moderationScore) {
        url.searchParams.set("moderationScore", moderationScore.toString());
      }

      if (excludeByModerationLabels) {
        url.searchParams.set(
          "excludeByModerationLabels",
          excludeByModerationLabels.join(","),
        );
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
    },
    { signal, retries },
  );
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
   * Filter replies by chain ID(s)
   */
  chainId: number | number[];
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
   * Filter replies by moderation score.
   *
   * Only comments with moderation score lower or equal to the provided value are returned.
   * This can be used to bypass premoderation, make sure to pass all moderation statuses to moderationStatus parameter
   * if the premoderation is enabled.
   */
  moderationScore?: number;
  /**
   * Filter replies by moderation labels.
   *
   * Only comments with moderation labels not included in the provided array are returned.
   * This can be used to bypass premoderation, make sure to pass all moderation statuses to moderationStatus parameter
   * if the premoderation is enabled.
   */
  excludeByModerationLabels?: IndexerAPIModerationClassificationLabelSchemaType[];
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
  chainId: z.union([z.number().int(), z.array(z.number().int())]),
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
  moderationScore: z.coerce.number().min(0).max(1).optional(),
  excludeByModerationLabels: z
    .array(IndexerAPIModerationClassificationLabelSchema)
    .optional(),
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
    chainId,
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
    moderationScore,
    excludeByModerationLabels,
  } = FetchCommentRepliesOptionSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL(`/api/comments/${commentId}/replies`, apiUrl);

      if (Array.isArray(chainId)) {
        url.searchParams.set("chainId", chainId.join(","));
      } else {
        url.searchParams.set("chainId", chainId.toString());
      }

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

      // channelId can be 0
      if (channelId != null) {
        url.searchParams.set("channelId", channelId.toString());
      }

      // commentType can be 0
      if (commentType != null) {
        url.searchParams.set("commentType", commentType.toString());
      }

      if (typeof moderationStatus === "string") {
        url.searchParams.set("moderationStatus", moderationStatus);
      } else if (
        Array.isArray(moderationStatus) &&
        moderationStatus.length > 0
      ) {
        url.searchParams.set("moderationStatus", moderationStatus.join(","));
      }

      if (moderationScore) {
        url.searchParams.set("moderationScore", moderationScore.toString());
      }

      if (excludeByModerationLabels) {
        url.searchParams.set(
          "excludeByModerationLabels",
          excludeByModerationLabels.join(","),
        );
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
    },
    { signal, retries },
  );
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

  return runAsync(
    async (signal) => {
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
    },
    { signal, retries },
  );
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

  return runAsync(
    async (signal) => {
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
    },
    { signal, retries },
  );
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
   * Filter channels by owner
   */
  owner?: Hex;
  /**
   * Filter channels by chain ID(s)
   */
  chainId: number | number[];
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
  owner: HexSchema.optional(),
  chainId: z.union([z.number().int(), z.array(z.number().int())]),
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
  const { apiUrl, limit, cursor, retries, sort, signal, owner, chainId } =
    FetchChannelsOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL("/api/channels", apiUrl);

      url.searchParams.set("sort", sort);
      url.searchParams.set("limit", limit.toString());

      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      if (owner) {
        url.searchParams.set("owner", owner);
      }

      if (Array.isArray(chainId)) {
        url.searchParams.set("chainId", chainId.join(","));
      } else {
        url.searchParams.set("chainId", chainId.toString());
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
    },
    { signal, retries },
  );
}

/**
 * The options for `fetchChannel()`
 */
export type FetchChannelOptions = {
  /**
   * The ID of the channel to fetch
   */
  channelId: bigint;
  /**
   * URL on which /api/channels/$channelId endpoint will be called
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
  signal?: AbortSignal;
};

const FetchChannelOptionsSchema = z.object({
  channelId: z.coerce.bigint(),
  apiUrl: z.string().url().default(INDEXER_API_URL),
  retries: z.number().int().positive().default(3),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch a single channel by ID from the Indexer API
 *
 * @returns A promise that resolves to the channel data fetched from the Indexer API
 */
export async function fetchChannel(
  options: FetchChannelOptions,
): Promise<IndexerAPIChannelOutputSchemaType> {
  const { channelId, apiUrl, retries, signal } =
    FetchChannelOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL(`/api/channels/${channelId}`, apiUrl);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-cache",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch channel: ${response.statusText}`);
      }

      const responseData = await response.json();

      return IndexerAPIChannelOutputSchema.parse(responseData);
    },
    { signal, retries },
  );
}

/**
 * The options for `fetchAutocomplete()`
 */
export type FetchAutocompleteOptions = {
  /**
   * The query to autocomplete
   */
  query: string;
  /**
   * The prefix character. $ is more specific and looks only for ERC20 tokens (by address or symbol),
   * @ is more general and looks for ENS/Farcaster name and ERC20 tokens.
   */
  char: "@" | "$";
  /**
   * URL on which /api/autocomplete endpoint will be called
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
  signal?: AbortSignal;
};

const FetchAutocompleteOptionsSchema = z.object({
  query: z.string().trim().min(2),
  char: z.enum(["@", "$"]),
  apiUrl: z.string().url().default(INDEXER_API_URL),
  retries: z.number().int().positive().default(3),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Fetch autocomplete suggestions from the Indexer API
 *
 * @returns A promise that resolves to autocomplete suggestions fetched from the Indexer API
 */
export async function fetchAutocomplete(
  options: FetchAutocompleteOptions,
): Promise<IndexerAPIGetAutocompleteOutputSchemaType> {
  const { query, char, apiUrl, retries, signal } =
    FetchAutocompleteOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL("/api/autocomplete", apiUrl);

      url.searchParams.set("query", query);
      url.searchParams.set("char", char);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-cache",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch autocomplete: ${response.statusText}`);
      }

      const responseData = await response.json();

      return IndexerAPIGetAutocompleteOutputSchema.parse(responseData);
    },
    { signal, retries },
  );
}

/**
 * The options for `reportComment()`
 */
export type ReportCommentOptions = {
  /**
   * The ID of the comment to report
   */
  commentId: Hex;
  /**
   * The address of the user reporting the comment
   */
  reportee: Hex;
  /**
   * Optional message explaining the reason for the report
   */
  message?: string;
  /**
   * The signature of the report typed data
   */
  signature: Hex;
  /**
   * The chain ID where the comment was posted
   */
  chainId: number;
  /**
   * URL on which /api/comments/$commentId/reports endpoint will be called
   *
   * @default "https://api.ethcomments.xyz"
   */
  apiUrl?: string;
  /**
   * Number of times to retry the operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  signal?: AbortSignal;
};

const ReportCommentOptionsSchema = z.object({
  commentId: HexSchema,
  reportee: HexSchema,
  message: z.string().max(200).optional(),
  signature: HexSchema,
  chainId: z.number().int().positive(),
  apiUrl: z.string().url().default(INDEXER_API_URL),
  retries: z.number().int().positive().default(3),
  signal: z.instanceof(AbortSignal).optional(),
});

/**
 * Report a comment to the Indexer API
 *
 * @returns A promise that resolves when the comment is reported successfully
 */
export async function reportComment(
  options: ReportCommentOptions,
): Promise<void> {
  const {
    commentId,
    reportee,
    message,
    signature,
    chainId,
    apiUrl,
    retries,
    signal,
  } = ReportCommentOptionsSchema.parse(options);

  return runAsync(
    async (signal) => {
      const url = new URL(`/api/comments/${commentId}/reports`, apiUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          reportee,
          message,
          signature,
          chainId,
        }),
        cache: "no-cache",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to report comment: ${response.statusText}`);
      }
    },
    { signal, retries },
  );
}
