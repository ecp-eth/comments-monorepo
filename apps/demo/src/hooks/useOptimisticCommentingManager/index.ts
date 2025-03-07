import {
  type QueryKey,
  useQueryClient,
} from "@tanstack/react-query";
import { useDeletingCommentManager } from "./useDeletingCommentManager";
import { useInsertingCommentManager } from "./useInsertingCommentManager";

/**
 * We want to have a responsive UI by immediately showing the comment after it's posted successfully.
 *
 * The Problem:
 * The fetchComments() function used for refreshing comments, goes through the indexer first,
 * and it takes a little bit of time for indexer to receive the event and process it.
 *
 * So if we refresh immediately after the post, depends on the network speed,
 * there is a chance that the comment posted is not indexed yet, in this case the user will not see
 * the comment posted immediately, and the fetchComments() will also overwrite existing pending comment
 * in the react query cache.
 *
 * So this hook does below to make sure the comment posted is visible to the user:
 * 1. insert pending comment operations into react query cache immediately after post.
 * 2. when the react query cache is updated, make sure the pending comment operation
 *     is inserted again if the comment id is not in the cache.
 *
 * @param queryKey
 * @returns `insertPendingCommentOperation` for inserting pending comment operations
 */
export function useOptimisticCommentingManager(queryKey: QueryKey) {
  const client = useQueryClient();
  const { insertPendingCommentOperation } = useInsertingCommentManager(
    client,
    queryKey
  );
  const { deletePendingCommentOperation } = useDeletingCommentManager(
    client,
    queryKey
  );

  return {
    insertPendingCommentOperation,
    deletePendingCommentOperation,
  };
}
