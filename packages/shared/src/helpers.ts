import type {
  Comment,
  PendingCommentOperationSchemaType,
  CommentPageSchemaType,
  ListCommentsQueryPageParamsSchemaType,
  PendingComment,
} from "./schemas.js";
import { getCommentCursor } from "@ecp.eth/sdk";
import type { InfiniteData } from "@tanstack/react-query";
import type { Hex } from "viem";
import { AuthorType } from "./types.js";
import { z } from "zod";

export function getCommentAuthorNameOrAddress(author: AuthorType): string {
  return (
    author.ens?.name ??
    author.farcaster?.displayName ??
    abbreviateAddressForDisplay(author.address)
  );
}

export function hasNewComments(
  oldQueryData: InfiniteData<CommentPageSchemaType>,
  newCommentsPage: CommentPageSchemaType
) {
  if (newCommentsPage.results.length === 0) {
    return false;
  }

  const pendingComments: Set<PendingComment["id"]> = new Set(
    oldQueryData.pages.flatMap((page) =>
      page.results
        .filter(
          (comment): comment is PendingComment => !!comment.pendingOperation
        )
        .map((comment) => comment.id)
    )
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
  newCommentsPage: CommentPageSchemaType
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  if (newCommentsPage.results.length === 0) {
    return oldQueryData;
  }

  const pendingComments: Map<PendingComment["id"], { pageIndex: number }> =
    new Map(
      oldQueryData.pages.flatMap((page, pageIndex) =>
        page.results
          .filter(
            (comment): comment is PendingComment => !!comment.pendingOperation
          )
          .map((comment) => [comment.id, { pageIndex }])
      )
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
  pendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  if (!queryData.pages[0]) {
    return queryData;
  }

  const { response, txHash, chainId } = pendingOperation;

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
    timestamp: new Date(),
    replies: {
      results: [],
      pagination: {
        hasPrevious: false,
        hasNext: false,
        limit: 0,
      },
    },
    pendingOperation,
  });

  return queryData;
}

/**
 * Replace a comment's pending operation with a new pending operation
 *
 * This function mutates the queryData argument
 *
 */
export function replaceCommentPendingOperationByComment(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  comment: Comment,
  newPendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  function replaceComment(page: CommentPageSchemaType): boolean {
    for (const c of page.results) {
      if (c.id === comment.id) {
        c.pendingOperation = newPendingOperation;

        return true;
      }

      if (c.replies && replaceComment(c.replies)) {
        return true;
      }
    }

    return false;
  }

  for (const page of queryData.pages) {
    if (replaceComment(page)) {
      return queryData;
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
  commentId: Hex
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  function markComment(page: CommentPageSchemaType): boolean {
    for (const comment of page.results) {
      if (comment.id === commentId) {
        comment.content = "[deleted]";
        comment.deletedAt = new Date();

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
  now: number
): string {
  const date = new Date(timestamp);
  const diffInMs = date.getTime() - now;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  // implement content negotiation and use the Accept-Language header to determine the locale
  // for now, we only support English since the UI is not translated
  return new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }).format(
    diffInDays,
    "day"
  );
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
  urlTemplate?: string
): string | null {
  if (!urlTemplate) {
    return null;
  }

  const url = urlTemplate.replace("{address}", author.address);

  return z.string().url().safeParse(url).success ? url : null;
}
