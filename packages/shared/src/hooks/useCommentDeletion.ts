import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  ListCommentsQueryDataSchema,
  type PendingDeleteCommentOperationSchemaType,
  type ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import {
  markCommentAsDeleted,
  markCommentAsDeleting,
  markCommentDeletionAsFailed,
} from "../helpers.js";
import type { Hex } from "viem";

type OnCommentDeletionStartParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  pendingOperation: PendingDeleteCommentOperationSchemaType;
};
type OnCommentDeletionSuccessParams = Pick<
  OnCommentDeletionStartParams,
  "pendingOperation" | "queryKey"
>;
type OnCommentDeletionErrorParams = Pick<
  OnCommentDeletionStartParams,
  "queryKey"
> & {
  commentId: Hex;
  error: Error;
};

type OnCommentDeletionStart = (params: OnCommentDeletionStartParams) => void;
type OnCommentDeletionSuccess = (
  params: OnCommentDeletionSuccessParams
) => void;
type OnCommentDeletionError = (params: OnCommentDeletionErrorParams) => void;

type CommentDeletionAPI = {
  start: OnCommentDeletionStart;
  success: OnCommentDeletionSuccess;
  error: OnCommentDeletionError;
};

export function useCommentDeletion(): CommentDeletionAPI {
  const client = useQueryClient();

  const start = useCallback<OnCommentDeletionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markCommentAsDeleting(queryData, params.pendingOperation);
        }
      );
    },
    [client]
  );

  const success = useCallback<OnCommentDeletionSuccess>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markCommentAsDeleted(
            queryData,
            params.pendingOperation.commentId
          );
        }
      );

      toast.success("Comment deleted");
    },
    [client]
  );

  const error = useCallback<OnCommentDeletionError>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markCommentDeletionAsFailed(
            queryData,
            params.commentId,
            params.error
          );
        }
      );

      toast.error("Failed to delete comment");
    },
    [client]
  );

  return useMemo(
    () => ({
      start,
      success,
      error,
    }),
    [start, success, error]
  );
}
