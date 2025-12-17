import type { CommentSelectType } from "ponder:schema";
import type { JSONCommentSelectType } from "./types";

export function convertJsonCommentToCommentSelectType(
  jsonComment: JSONCommentSelectType,
): CommentSelectType {
  return {
    id: jsonComment.id,
    author: jsonComment.author,
    app: jsonComment.app,
    createdAt: new Date(jsonComment.created_at),
    updatedAt: new Date(jsonComment.updated_at),
    deletedAt: jsonComment.deleted_at ? new Date(jsonComment.deleted_at) : null,
    channelId: BigInt(jsonComment.channel_id),
    moderationStatusChangedAt: new Date(
      jsonComment.moderation_status_changed_at,
    ),
    content: jsonComment.content,
    metadata: jsonComment.metadata,
    hookMetadata: jsonComment.hook_metadata,
    targetUri: jsonComment.target_uri,
    commentType: jsonComment.comment_type,
    parentId: jsonComment.parent_id,
    chainId: jsonComment.chain_id,
    rootCommentId: jsonComment.root_comment_id,
    txHash: jsonComment.tx_hash,
    logIndex: jsonComment.log_index,
    revision: jsonComment.revision,
    zeroExSwap: jsonComment.zero_ex_swap,
    references: jsonComment.references,
    reactionCounts: jsonComment.reaction_counts,
    moderationClassifierResult: jsonComment.moderation_classifier_result,
    moderationClassifierScore: jsonComment.moderation_classifier_score,
    moderationStatus: jsonComment.moderation_status,
    referencesResolutionStatus: jsonComment.references_resolution_status,
    referencesResolutionStatusChangedAt:
      jsonComment.references_resolution_status_changed_at
        ? new Date(jsonComment.references_resolution_status_changed_at)
        : null,
    path:
      jsonComment.path ||
      `${jsonComment.author.toLowerCase()}/${jsonComment.id.toLowerCase()}`,
  };
}
