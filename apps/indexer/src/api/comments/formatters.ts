import type { Hex } from "@ecp.eth/sdk/core";
import { REPLIES_PER_COMMENT } from "../../lib/constants";
import {
  createUserDataAndFormatSingleCommentResponseResolver,
  mapReplyCountsByCommentId,
} from "../../lib/response-formatters";
import { ensByAddressResolverService } from "../../services/ens-by-address-resolver";
import { farcasterByAddressResolverService } from "../../services/farcaster-by-address-resolver";
import type { fetchCommentWithReplies } from "./fetchers";

/**
 * Formats a comment with its replies for API response.
 * This function handles collecting author addresses, resolving ENS/Farcaster data,
 * mapping reply counts, and formatting the comment response.
 *
 * @param comment - The comment with its relations (must not be null)
 * @param params - Parameters for formatting (mode, commentType, isReplyDeleted)
 * @returns The formatted comment ready for API response
 */
export async function formatCommentWithRepliesResponse(
  comment: NonNullable<Awaited<ReturnType<typeof fetchCommentWithReplies>>>,
  params: {
    mode: "flat" | "nested";
    commentType?: number;
    isReplyDeleted?: boolean;
  },
) {
  const { mode, commentType, isReplyDeleted } = params;

  const authorAddresses = new Set<Hex>();

  if (comment.author) {
    authorAddresses.add(comment.author);
  }

  const replies = mode === "flat" ? comment.flatReplies : comment.replies;

  for (const reply of replies) {
    if (reply.author) {
      authorAddresses.add(reply.author);
    }
  }

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData, replyCounts] =
    await Promise.all([
      ensByAddressResolverService.loadMany([...authorAddresses]),
      farcasterByAddressResolverService.loadMany([...authorAddresses]),
      mapReplyCountsByCommentId([comment], {
        mode,
        isDeleted: isReplyDeleted,
        commentType,
      }),
    ]);

  const resolveUserDataAndFormatSingleCommentResponse =
    createUserDataAndFormatSingleCommentResponseResolver({
      replyLimit: REPLIES_PER_COMMENT,
      resolvedAuthorsEnsData,
      resolvedAuthorsFarcasterData,
      replyCounts,
    });

  const formattedComment =
    await resolveUserDataAndFormatSingleCommentResponse(comment);

  return formattedComment;
}
