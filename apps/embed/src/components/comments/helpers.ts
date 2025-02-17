import type {
  Comment,
  PendingCommentOperationSchemaType,
  CommentPageSchemaType,
} from "@/lib/schemas";
import { type InfiniteData } from "@tanstack/react-query";

export function deletePendingCommentByTransactionHash(
  queryData: InfiniteData<CommentPageSchemaType>,
  transactionHash: string
): InfiniteData<CommentPageSchemaType> {
  const clonedData = structuredClone(queryData);

  function deleteComment(page: CommentPageSchemaType): boolean {
    for (const comment of page.results) {
      if (comment.pendingOperation?.txHash === transactionHash) {
        delete comment.pendingOperation;

        return true;
      }

      if (deleteComment(comment.replies)) {
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
  queryData: InfiniteData<CommentPageSchemaType>,
  pendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType> {
  const clonedData = structuredClone(queryData);

  const { response, txHash, chainId } = pendingOperation;

  clonedData.pages[0].results.unshift({
    ...response.data,
    author: {
      address: response.data.author,
    },
    deletedAt: null,
    logIndex: 0,
    txHash,
    chainId,
    timestamp: new Date(),
    replies: {
      results: [],
      pagination: {
        hasMore: false,
        limit: 0,
        offset: 0,
      },
    },
    pendingOperation,
  });

  return clonedData;
}

export function replaceCommentPendingOperationByComment(
  queryData: InfiniteData<CommentPageSchemaType>,
  comment: Comment,
  newPendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType> {
  const clonedData = structuredClone(queryData);

  function replaceComment(page: CommentPageSchemaType): boolean {
    for (const c of page.results) {
      if (c.id === comment.id) {
        c.pendingOperation = newPendingOperation;

        return true;
      }

      if (replaceComment(c.replies)) {
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
