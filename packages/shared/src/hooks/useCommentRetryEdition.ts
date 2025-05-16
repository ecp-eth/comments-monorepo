import {
  markCommentAsReediting,
  markPendingEditCommentAsEdited,
  markPendingEditCommentAsFailed,
} from "../helpers.js";
import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
  type PendingEditCommentOperationSchemaType,
} from "../schemas.js";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMemo } from "react";
import { toast } from "sonner";

type OnCommentRetryEditionStartParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  pendingOperation: PendingEditCommentOperationSchemaType;
};

type OnCommentRetryEditionSuccessParams = Pick<
  OnCommentRetryEditionStartParams,
  "pendingOperation" | "queryKey"
>;
type OnCommentRetryEditionErrorParams = Pick<
  OnCommentRetryEditionStartParams,
  "pendingOperation" | "queryKey"
> & {
  error: Error;
};

type OnCommentRetryEditionStart = (
  params: OnCommentRetryEditionStartParams
) => void;
type OnCommentRetryEditionSuccess = (
  params: OnCommentRetryEditionSuccessParams
) => void;
type OnCommentRetryEditionError = (
  params: OnCommentRetryEditionErrorParams
) => void;

type CommentRetryEditionAPI = {
  start: OnCommentRetryEditionStart;
  success: OnCommentRetryEditionSuccess;
  error: OnCommentRetryEditionError;
};

export function useCommentRetryEdition(): CommentRetryEditionAPI {
  const client = useQueryClient();

  const start = useCallback<OnCommentRetryEditionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markCommentAsReediting(queryData, params.pendingOperation);
        }
      );
    },
    [client]
  );

  const success = useCallback<OnCommentRetryEditionSuccess>(
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
            params.pendingOperation.response.data.commentId
          );
        }
      );

      toast.success("Comment edited");
    },
    [client]
  );

  const error = useCallback<OnCommentRetryEditionError>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markPendingEditCommentAsFailed(
            queryData,
            params.pendingOperation.response.data.commentId,
            params.error
          );
        }
      );

      toast.error("Failed to edit comment");
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
