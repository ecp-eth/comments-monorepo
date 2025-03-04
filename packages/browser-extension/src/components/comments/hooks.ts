import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "@/lib/schemas";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type {
  OnDeleteComment,
  OnPostCommentSuccess,
  OnRetryPostComment,
} from "./Comment";
import {
  deletePendingCommentByTransactionHash,
  insertPendingCommentToPage,
  markCommentAsDeleted,
  replaceCommentPendingOperationByComment,
} from "./helpers";
import type { OnSubmitSuccessFunction } from "./CommentForm";

export function useHandleCommentDeleted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnDeleteComment {
  const client = useQueryClient();

  return useCallback(
    (commentId) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return markCommentAsDeleted(queryData, commentId);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleCommentSubmitted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnSubmitSuccessFunction {
  const client = useQueryClient();

  return useCallback(
    (pendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return insertPendingCommentToPage(queryData, pendingOperation);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleCommentPostedSuccessfully({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnPostCommentSuccess {
  const client = useQueryClient();

  return useCallback(
    (transactionHash) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return deletePendingCommentByTransactionHash(
            queryData,
            transactionHash
          );
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleRetryPostComment({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnRetryPostComment {
  const client = useQueryClient();

  return useCallback(
    (comment, newPendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return replaceCommentPendingOperationByComment(
            queryData,
            comment,
            newPendingOperation
          );
        }
      );
    },
    [client, queryKey]
  );
}
