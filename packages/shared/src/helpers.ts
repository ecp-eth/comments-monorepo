import {
  Comment,
  type CommentDataWithIdSchemaType,
  type CommentPageSchemaType,
  type ListCommentsQueryPageParamsSchemaType,
  PendingComment,
  type PendingDeleteCommentOperationSchemaType,
  type PendingEditCommentOperationSchemaType,
  type PendingPostCommentOperationSchemaType,
} from "./schemas.js";
import type { InfiniteData } from "@tanstack/react-query";
import { clsx, type ClassValue } from "clsx";
import type { Chain, ContractFunctionExecutionError, Hex } from "viem";
import { http } from "wagmi";
import * as allChains from "wagmi/chains";
import type { AuthorType, ProcessEnvNetwork } from "./types.js";
import { z } from "zod";
import { twMerge } from "tailwind-merge";
import {
  getCommentCursor,
  type IndexerAPIListCommentRepliesSchemaType,
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIExtraSchemaType,
} from "@ecp.eth/sdk/indexer";

function parseURL(url: string) {
  // use zod instead, `URL.canParse` does not work in RN 🤷‍♂️
  return z.string().url().safeParse(url).success ? url : null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSameHex(a: Hex, b: Hex) {
  return a.toLowerCase() === b.toLowerCase();
}

export function getCommentAuthorNameOrAddress(author: AuthorType): string {
  return (
    author.ens?.name ??
    author.farcaster?.displayName ??
    abbreviateAddressForDisplay(author.address)
  );
}

export function hasNewComments(
  oldQueryData: InfiniteData<CommentPageSchemaType>,
  newCommentsPage:
    | IndexerAPIListCommentsSchemaType
    | IndexerAPIListCommentRepliesSchemaType,
) {
  if (newCommentsPage.results.length === 0) {
    return false;
  }

  const pendingComments: Set<PendingComment["id"]> = new Set(
    oldQueryData.pages.flatMap((page) =>
      page.results
        .filter(
          (comment): comment is PendingComment =>
            comment.pendingOperation?.action === "post",
        )
        .map((comment) => comment.id),
    ),
  );

  for (const newComment of newCommentsPage.results) {
    if (!pendingComments.has(newComment.id)) {
      return true;
    }
  }

  return false;
}

export function mergeNewComments(
  oldQueryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  newCommentsPage:
    | IndexerAPIListCommentsSchemaType
    | IndexerAPIListCommentRepliesSchemaType,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  if (newCommentsPage.results.length === 0) {
    return oldQueryData;
  }

  const pendingComments: Map<PendingComment["id"], { pageIndex: number }> =
    new Map(
      oldQueryData.pages.flatMap((page, pageIndex) =>
        page.results
          .filter(
            (comment): comment is PendingComment =>
              comment.pendingOperation?.action === "post",
          )
          .map((comment) => [comment.id, { pageIndex }]),
      ),
    );

  for (const newComment of newCommentsPage.results) {
    if (pendingComments.has(newComment.id)) {
      const { pageIndex } = pendingComments.get(newComment.id)!;

      oldQueryData.pages[pageIndex]!.results = oldQueryData.pages[
        pageIndex
      ]!.results.filter((comment) => comment.id !== newComment.id);
    }
  }

  return {
    pages: [
      {
        extra: newCommentsPage.extra,
        results: newCommentsPage.results.slice().reverse(),
        pagination: {
          ...newCommentsPage.pagination,
          // new comments is using reverse ordering therefore we have to swap the start and end cursors
          // so it matches the old query data ordering
          startCursor: newCommentsPage.pagination.endCursor,
          endCursor: newCommentsPage.pagination.startCursor,
        },
      },
      ...oldQueryData.pages,
    ],
    pageParams: [
      {
        limit: newCommentsPage.pagination.limit,
      },
      ...oldQueryData.pageParams,
    ],
  };
}

/**
 * Mark a comment as deleting by setting the `pendingOperation` field to a pending delete operation
 *
 * This function mutates the queryData argument
 */
export function markCommentAsDeleting(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingDeleteCommentOperationSchemaType,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (isSameHex(comment.id, pendingOperation.commentId)) {
        comment.pendingOperation = {
          action: "delete",
          type: pendingOperation.type,
          txHash: pendingOperation.txHash,
          chainId: pendingOperation.chainId,
          commentId: pendingOperation.commentId,
          state: {
            status: "pending",
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a comment's pending delete operation as failed
 *
 * This function mutates the queryData argument
 */
export function markCommentDeletionAsFailed(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
  error: Error,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (
        isSameHex(comment.id, commentId) &&
        comment.pendingOperation?.action === "delete"
      ) {
        comment.pendingOperation = {
          ...comment.pendingOperation,
          state: {
            status: "error",
            error,
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Insert a pending comment to the first page of the query data
 *
 * This function mutates the queryData argument
 *
 */
export function insertPendingCommentToPage(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingPostCommentOperationSchemaType,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  if (!queryData.pages[0]) {
    return queryData;
  }

  const { response, txHash, chainId, zeroExSwap } = pendingOperation;

  queryData.pages[0].results.unshift({
    ...response.data,
    author: pendingOperation.resolvedAuthor ?? {
      address: response.data.author,
    },
    cursor: getCommentCursor(response.data.id, new Date()),
    deletedAt: null,
    logIndex: 0,
    txHash,
    chainId,
    createdAt: new Date(),
    updatedAt: new Date(),
    revision: 0,
    metadata: [],
    hookMetadata: [],
    moderationStatus: getModerationStatus(
      queryData.pages[0].extra,
      response.data,
    ),
    moderationStatusChangedAt: new Date(),
    zeroExSwap: zeroExSwap ?? null,
    references: [],
    replies: {
      extra: queryData.pages[0].extra,
      results: [],
      pagination: {
        hasPrevious: false,
        hasNext: false,
        limit: 3,
      },
    },
    viewerReactions: {},
    reactionCounts: {},
    pendingOperation,
  });

  return queryData;
}

export function getModerationStatus(
  extra: IndexerAPIExtraSchemaType,
  comment: CommentDataWithIdSchemaType,
): "pending" | "approved" {
  if (!extra.moderationEnabled) {
    return "approved";
  }

  // commentType 1 represents reactions
  if (
    comment.commentType === 1 &&
    extra.moderationKnownReactions.includes(comment.content)
  ) {
    return "approved";
  }

  return "pending";
}

/**
 * Mark a comment's pending post operation as pending
 *
 * This function mutates the queryData argument
 */
export function markCommentAsReposting(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingPostCommentOperationSchemaType,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (isSameHex(comment.id, pendingOperation.response.data.id)) {
        comment.pendingOperation = {
          ...pendingOperation,
          action: "post",
          state: {
            status: "pending",
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a pending post comment as failed
 *
 * This function mutates the queryData argument
 */
export function markPendingPostCommentAsFailed(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
  error: Error,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (
        isSameHex(comment.id, commentId) &&
        comment.pendingOperation?.action === "post"
      ) {
        comment.pendingOperation = {
          ...comment.pendingOperation,
          state: {
            status: "error",
            error,
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a pending post comment as posted
 *
 * This function mutates the queryData argument
 */
export function markPendingPostCommentAsPosted(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
) {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (
        isSameHex(comment.id, commentId) &&
        comment.pendingOperation?.action === "post"
      ) {
        comment.pendingOperation = {
          ...comment.pendingOperation,
          state: {
            status: "success",
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a comment as re-editing by setting the `pendingOperation` field to a pending edit operation
 *
 * This function mutates the queryData argument
 */
export function markCommentAsReediting(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingEditCommentOperationSchemaType,
) {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (isSameHex(comment.id, pendingOperation.response.data.commentId)) {
        comment.pendingOperation = {
          ...pendingOperation,
          action: "edit",
          state: {
            status: "pending",
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a pending edit comment as pending
 *
 * This function mutates the queryData argument
 */
export function markPendingEditCommentAsPending(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingEditCommentOperationSchemaType,
) {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (isSameHex(comment.id, pendingOperation.response.data.commentId)) {
        comment.content = pendingOperation.response.data.content;
        comment.revision++;
        comment.pendingOperation = pendingOperation;

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a pending edit comment as failed
 *
 * This function mutates the queryData argument
 */
export function markPendingEditCommentAsFailed(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
  error: Error,
) {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (
        isSameHex(comment.id, commentId) &&
        comment.pendingOperation?.action === "edit"
      ) {
        comment.pendingOperation = {
          ...comment.pendingOperation,
          state: {
            status: "error",
            error,
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a pending edit comment as edited
 *
 * This function mutates the queryData argument
 */
export function markPendingEditCommentAsEdited(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
) {
  for (const page of queryData.pages) {
    for (const comment of page.results) {
      if (
        isSameHex(comment.id, commentId) &&
        comment.pendingOperation?.action === "edit"
      ) {
        comment.pendingOperation = {
          ...comment.pendingOperation,
          state: {
            status: "success",
          },
        };

        return queryData;
      }
    }
  }

  return queryData;
}

/**
 * Mark a comment as deleted by setting the `deletedAt` field to the current date
 * and setting the `content` field to "[deleted]"
 *
 * This function mutates the queryData argument
 *
 * @param queryData
 * @param commentId
 * @returns
 */
export function markCommentAsDeleted(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex,
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  function markComment(page: CommentPageSchemaType): boolean {
    for (const comment of page.results) {
      if (comment.id === commentId) {
        comment.content = "[deleted]";
        comment.deletedAt = new Date();

        if (comment.pendingOperation?.action === "delete") {
          comment.pendingOperation = {
            ...comment.pendingOperation,
            state: {
              status: "success",
            },
          };
        }

        return true;
      }

      if (comment.replies && markComment(comment.replies)) {
        return true;
      }
    }

    return false;
  }

  for (const page of queryData.pages) {
    if (markComment(page)) {
      return queryData;
    }
  }

  return queryData;
}

/**
 * Create a markdown style quotation from a comment's content
 *
 * Example:
 *
 * > This is a comment
 * >
 * > It has multiple lines
 *
 * @param comment
 * @returns
 */
export function createQuotationFromComment(comment: Comment): string {
  return "> " + comment.content.split("\n").join("\n> ") + "\n\n";
}

export function abbreviateAddressForDisplay(address: string): string {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestamp: number | Date): string {
  const date = new Date(timestamp);

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateRelative(
  timestamp: number | Date,
  now: number,
): string {
  const date = new Date(timestamp);
  const diffInMs = date.getTime() - now;
  const diffInSeconds = Math.round(diffInMs / 1000);
  const diffInMinutes = Math.round(diffInMs / (1000 * 60));
  const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.round(diffInMs / (1000 * 60 * 60 * 24 * 7));
  const diffInMonths = Math.round(diffInMs / (1000 * 60 * 60 * 24 * 30));
  const diffInYears = Math.round(diffInMs / (1000 * 60 * 60 * 24 * 365));

  const formatter = new Intl.RelativeTimeFormat("en-US", {
    numeric: "auto",
  });

  // use "now" if less than 60 seconds
  if (Math.abs(diffInSeconds) < 60) {
    return formatter.format(0, "second");
  }

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, "minute");
  }

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, "hour");
  }

  if (Math.abs(diffInDays) < 7) {
    return formatter.format(diffInDays, "day");
  }

  if (Math.abs(diffInWeeks) < 4) {
    return formatter.format(diffInWeeks, "week");
  }

  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(diffInMonths, "month");
  }

  return formatter.format(diffInYears, "year");
}

/**
 * Replaces bigint values with their string representation
 * usually used in JSON.stringify
 * @param key
 * @param value
 * @returns
 */
export function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

/**
 * Format an author's link
 *
 * @param author
 * @returns
 */
export function formatAuthorLinkWithTemplate(
  author: AuthorType,
  urlTemplate?: string,
): string | null {
  if (!urlTemplate) {
    return null;
  }

  const url = urlTemplate.replace("{address}", author.address);

  return parseURL(url);
}

/**
 * Get a chain by id
 * @param id
 * @param chains
 * @returns
 */
export function getChainById<TChain extends Chain>(
  id: number,
  chains: Readonly<TChain[]>,
): TChain | undefined {
  for (const [, chain] of Object.entries(chains)) {
    if (chain.id === id) {
      return chain;
    }
  }
  return undefined;
}

/**
 * A typed json response
 */
export class JSONResponse<TSchema extends z.ZodType> extends Response {
  // branded type so it doesn't allow to assign a different schema
  private __outputType!: z.output<TSchema>;

  constructor(
    parser: TSchema,
    data: z.input<TSchema>,
    init?: ResponseInit & {
      jsonReplacer?: (key: string, value: unknown) => unknown;
    },
  ) {
    const { jsonReplacer, ...responseInit } = init || {};

    super(JSON.stringify(parser.parse(data), jsonReplacer), {
      ...responseInit,
      headers: {
        ...responseInit?.headers,
        "Content-Type": "application/json",
      },
    });
  }
}

export function getNetworkFromProcessEnv(
  prefix: string,
  processEnv: object,
): Record<number, ProcessEnvNetwork> {
  const urlEnvName = prefix + "RPC_URL_";
  const networks = Object.entries(processEnv).reduce(
    (acc, [key, value]) => {
      if (!key.startsWith(urlEnvName)) {
        return acc;
      }

      const chainId = parseInt(key.replace(urlEnvName, ""));

      acc[chainId] = {
        chainId,
        chain: getChainById(chainId, Object.values(allChains))!,
        transport: http(value),
      };

      return acc;
    },
    {} as Record<number, ProcessEnvNetwork>,
  );

  return networks;
}

export function formatContractFunctionExecutionError(
  error: ContractFunctionExecutionError,
) {
  if (error.shortMessage.includes("User rejected the request")) {
    return "Transaction was rejected.";
  }

  if (error.shortMessage.includes("has not been authorized by the user")) {
    return "Transaction not authorized. Please ensure your wallet is unlocked and the session is active.";
  }

  return error.details;
}
