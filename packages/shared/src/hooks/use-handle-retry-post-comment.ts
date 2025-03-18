import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OnRetryPostComment } from "../types.js";
import { replaceCommentPendingOperationByComment } from "../helpers.js";

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
