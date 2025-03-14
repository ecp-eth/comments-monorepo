import type {
  Comment,
  CommentPageSchemaType,
  PendingCommentOperationSchemaType,
} from "@/lib/schemas";
import type { CommentType } from "@/lib/types";
import { abbreviateAddressForDisplay } from "@/lib/utils";
import { getCommentCursor } from "@ecp.eth/sdk";
import type { InfiniteData } from "@tanstack/react-query";
import type { Hex } from "viem";

export function getCommentAuthorNameOrAddress(
  author: CommentType["author"]
): string {
  return (
    author.ens?.name ??
    author.farcaster?.displayName ??
    abbreviateAddressForDisplay(author.address)
  );
}

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
  queryData: InfiniteData<CommentPageSchemaType>,
  pendingOperation: PendingCommentOperationSchemaType
): InfiniteData<CommentPageSchemaType> {
  const clonedData = structuredClone(queryData);

  const { response, txHash, chainId } = pendingOperation;

  clonedData.pages[0].results.unshift({
    ...response.data,
    author: pendingOperation.resolvedAuthor ?? {
      address: response.data.author,
    },
    // @todo is there a better way to do this? do we even need a cursor here?
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
  queryData: InfiniteData<CommentPageSchemaType>,
  commentId: Hex
): InfiniteData<CommentPageSchemaType> {
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
