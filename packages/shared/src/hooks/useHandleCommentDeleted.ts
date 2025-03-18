import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import type { OnDeleteComment } from "../types.js";
import { markCommentAsDeleted } from "../helpers.js";

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
