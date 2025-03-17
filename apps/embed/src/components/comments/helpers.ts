import type {
  Comment,
  PendingCommentOperationSchemaType,
  CommentPageSchemaType,
  ListCommentsQueryPageParamsSchemaType,
  PendingComment,
} from "@/lib/schemas";
import { abbreviateAddressForDisplay } from "@/lib/utils";
import { getCommentCursor } from "@ecp.eth/sdk";
import type { InfiniteData } from "@tanstack/react-query";
import type { Hex } from "viem";

export function getCommentAuthorNameOrAddress(
  author: Comment["author"]
): string {
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

      oldQueryData.pages[pageIndex].results = oldQueryData.pages[
        pageIndex
      ].results.filter((comment) => comment.id !== newComment.id);
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

export function deletePendingCommentByTransactionHash(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  transactionHash: string
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  const clonedData = structuredClone(queryData);

  function deleteComment(page: CommentPageSchemaType): boolean {
    for (const comment of page.results) {
      if (comment.pendingOperation?.txHash === transactionHash) {
        delete comment.pendingOperation;

        return true;
      }

      if (comment.replies && deleteComment(comment.replies)) {
        return true;
      }
    }

    return false;
  }

  for (const page of clonedData.pages) {
    if (deleteComment(page)) {
      return clonedData;
    }
  }

  return clonedData;
}

export function insertPendingCommentToPage(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  pendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  const clonedData = structuredClone(queryData);

  const { response, txHash, chainId } = pendingOperation;

  clonedData.pages[0].results.unshift({
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

  return clonedData;
}

export function replaceCommentPendingOperationByComment(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  comment: Comment,
  newPendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  const clonedData = structuredClone(queryData);

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

  for (const page of clonedData.pages) {
    if (replaceComment(page)) {
      return clonedData;
    }
  }

  return clonedData;
}

export function markCommentAsDeleted(
  queryData: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >,
  commentId: Hex
): InfiniteData<CommentPageSchemaType, ListCommentsQueryPageParamsSchemaType> {
  const clonedData = structuredClone(queryData);

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

  for (const page of clonedData.pages) {
    if (markComment(page)) {
      return clonedData;
    }
  }

  return clonedData;
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
