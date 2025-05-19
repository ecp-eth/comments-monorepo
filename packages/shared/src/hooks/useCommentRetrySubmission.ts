import {
  markPendingPostCommentAsFailed,
  markCommentAsReposting,
  markPendingPostCommentAsPosted,
} from "../helpers.js";
import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
  type PendingPostCommentOperationSchemaType,
} from "../schemas.js";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useMemo } from "react";
import { toast } from "sonner";

type OnCommentRetrySubmissionStartParams = {
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  pendingOperation: PendingPostCommentOperationSchemaType;
};

type OnCommentRetrySubmissionSuccessParams = Pick<
  OnCommentRetrySubmissionStartParams,
  "pendingOperation" | "queryKey"
>;
type OnCommentRetrySubmissionErrorParams = Pick<
  OnCommentRetrySubmissionStartParams,
  "pendingOperation" | "queryKey"
> & {
  error: Error;
};

type OnCommentRetrySubmissionStart = (
  params: OnCommentRetrySubmissionStartParams,
) => void;
type OnCommentRetrySubmissionSuccess = (
  params: OnCommentRetrySubmissionSuccessParams,
) => void;
type OnCommentRetrySubmissionError = (
  params: OnCommentRetrySubmissionErrorParams,
) => void;

type CommentRetrySubmissionAPI = {
  start: OnCommentRetrySubmissionStart;
  success: OnCommentRetrySubmissionSuccess;
  error: OnCommentRetrySubmissionError;
};

export function useCommentRetrySubmission(): CommentRetrySubmissionAPI {
  const client = useQueryClient();

  const start = useCallback<OnCommentRetrySubmissionStart>(
    (params) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        params.queryKey,
        (data) => {
          if (!data) {
            return data;
          }

          const queryData = ListCommentsQueryDataSchema.parse(data);

          return markCommentAsReposting(queryData, params.pendingOperation);
        },
      );
    },
    [client],
  );

  const success = useCallback<OnCommentRetrySubmissionSuccess>(
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
            params.pendingOperation.response.data.id,
          );
        },
      );

      toast.success("Comment posted");
    },
    [client],
  );

  const error = useCallback<OnCommentRetrySubmissionError>(
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
            params.pendingOperation.response.data.id,
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
