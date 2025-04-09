import {
  insertPendingCommentToPage,
  markPendingPostCommentAsPosted,
  markPendingPostCommentAsFailed,
} from "@ecp.eth/shared/helpers";
import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
  type PendingPostCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Hex } from "viem";

type OnCommentSubmissionStartParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  pendingOperation: PendingPostCommentOperationSchemaType;
};

type OnCommentSubmissionSuccessParams = Pick<
  OnCommentSubmissionStartParams,
  "pendingOperation" | "queryKey"
>;
type OnCommentSubmissionErrorParams = Pick<
  OnCommentSubmissionStartParams,
  "queryKey"
> & {
  commentId: Hex;
  error: Error;
};

type OnCommentSubmissionStart = (
  params: OnCommentSubmissionStartParams
) => void;
type OnCommentSubmissionSuccess = (
  params: OnCommentSubmissionSuccessParams
) => void;
type OnCommentSubmissionError = (
  params: OnCommentSubmissionErrorParams
) => void;

type CommentSubmissionAPI = {
  start: OnCommentSubmissionStart;
  success: OnCommentSubmissionSuccess;
  error: OnCommentSubmissionError;
};

export function useCommentSubmission(): CommentSubmissionAPI {
  const client = useQueryClient();

  const start = useCallback<OnCommentSubmissionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return insertPendingCommentToPage(queryData, params.pendingOperation);
        }
      );
    },
    [client]
  );

  const success = useCallback<OnCommentSubmissionSuccess>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markPendingPostCommentAsPosted(
            queryData,
            params.pendingOperation.response.data.id
          );
        }
      );

      toast.success("Comment posted");
    },
    [client]
  );

  const error = useCallback<OnCommentSubmissionError>(
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
            params.error
          );
        }
      );

      toast.error("Failed to post comment");
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
