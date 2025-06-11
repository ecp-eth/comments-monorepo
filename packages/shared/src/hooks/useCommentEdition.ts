import {
  markPendingPostCommentAsFailed,
  markPendingEditCommentAsEdited,
  markPendingEditCommentAsPending,
} from "../helpers.js";
import {
  ListCommentsQueryDataSchema,
  type PendingEditCommentOperationSchemaType,
  type ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Hex } from "viem";

type OnCommentEditionStartParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  pendingOperation: PendingEditCommentOperationSchemaType;
};

type OnCommentEditionSuccessParams = Pick<
  OnCommentEditionStartParams,
  "pendingOperation" | "queryKey"
>;
type OnCommentEditionErrorParams = Pick<
  OnCommentEditionStartParams,
  "queryKey"
> & {
  commentId: Hex;
  error: Error;
};

type OnCommentEditionStart = (params: OnCommentEditionStartParams) => void;
type OnCommentEditionSuccess = (params: OnCommentEditionSuccessParams) => void;
type OnCommentEditionError = (params: OnCommentEditionErrorParams) => void;

type CommentEditionAPI = {
  start: OnCommentEditionStart;
  success: OnCommentEditionSuccess;
  error: OnCommentEditionError;
};

export function useCommentEdition(): CommentEditionAPI {
  const client = useQueryClient();

  const start = useCallback<OnCommentEditionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markPendingEditCommentAsPending(
            queryData,
            params.pendingOperation,
          );
        },
      );
    },
    [client],
  );

  const success = useCallback<OnCommentEditionSuccess>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markPendingEditCommentAsEdited(
            queryData,
            params.pendingOperation.response.data.commentId,
          );
        },
      );

      toast.success("Comment updated");
    },
    [client],
  );

  const error = useCallback<OnCommentEditionError>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markPendingPostCommentAsFailed(
            queryData,
            params.commentId,
            params.error,
          );
        },
      );

      toast.error("Failed to post comment");
    },
    [client],
  );

  return useMemo(
    () => ({
      start,
      success,
      error,
    }),
    [start, success, error],
  );
}
