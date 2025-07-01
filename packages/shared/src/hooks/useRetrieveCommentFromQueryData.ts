import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { Hex } from "viem";
import { ListCommentsQueryDataSchemaType } from "../schemas";
import { useCallback } from "react";

export const useRetrieveCommentFromQueryData = () => {
  const client = useQueryClient();

  return useCallback(
    (commentId: Hex, queryKey: QueryKey) => {
      const queryData = client.getQueryData<
        ListCommentsQueryDataSchemaType | undefined
      >(queryKey);

      if (!queryData) {
        return undefined;
      }

      return queryData.pages
        .flatMap((page) => page.results)
        .find((comment) => comment.id === commentId);
    },
    [client],
  );
};
