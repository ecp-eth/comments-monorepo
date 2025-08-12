import {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPICommentWithRepliesSchemaType,
  IndexerAPIListCommentRepliesSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";

/**
 * tree traverse over comments returned from indexer api, include the ones in replies
 * @param indexerAPIListCommentResult
 * @param callback returns false to break the loop
 * @returns true if the callback returns `true | undefined` for all comments
 */
export function everyIndexerAPIListComments(
  indexerAPIListCommentResult: IndexerAPIListCommentRepliesSchemaType,
  callback: (
    indexerAPIComment: IndexerAPICommentSchemaType,
    parentStructure: IndexerAPIListCommentRepliesSchemaType,
  ) => boolean | undefined,
) {
  const comments = indexerAPIListCommentResult.results;

  return comments.every((indexerAPIComment): boolean => {
    const abort =
      callback(indexerAPIComment, indexerAPIListCommentResult) === false;

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
