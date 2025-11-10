import {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPICommentWithRepliesSchemaType,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { IndexerAPIListCommentsSchemaTypeWithOptionalResultsReplies } from "./schemas";

/**
 * tree traverse over comments returned from indexer api, include the ones in replies
 * @param indexerAPIListCommentResult
 * @param callback returns false to break the loop
 * @returns true if the callback returns `true | undefined` for all comments
 */
export function everyIndexerAPIListComments(
  indexerAPIListComments: IndexerAPIListCommentsSchemaTypeWithOptionalResultsReplies,
  callback: (
    indexerAPIComment: IndexerAPICommentSchemaType,
    parentStructure: IndexerAPIListCommentsSchemaTypeWithOptionalResultsReplies,
  ) => boolean | undefined,
) {
  const comments = indexerAPIListComments.results;

  return comments.every((indexerAPIComment): boolean => {
    const abort = callback(indexerAPIComment, indexerAPIListComments) === false;

    if (abort) {
      return false;
    }

    if (!isIndexerAPICommentWithRepliesSchema(indexerAPIComment)) {
      return true;
    }

    return everyIndexerAPIListComments(indexerAPIComment.replies, callback);
  });
}

/**
 * Type narrowing to IndexerAPICommentWithRepliesSchema
 * @param indexerAPIComment
 * @returns
 */
export function isIndexerAPICommentWithRepliesSchema(
  indexerAPIComment: IndexerAPICommentSchemaType,
): indexerAPIComment is IndexerAPICommentWithRepliesSchemaType {
  try {
    IndexerAPICommentWithRepliesSchema.parse(indexerAPIComment);
    return true;
  } catch {
    return false;
  }
}
