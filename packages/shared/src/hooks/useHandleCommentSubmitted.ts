import {
  ListCommentsQueryDataSchema,
  type ListCommentsQueryDataSchemaType,
} from "../schemas.js";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { OnSubmitSuccessFunction } from "../types.js";
import { insertPendingCommentToPage } from "../helpers.js";

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
