import { useConfig, useWriteContract } from "wagmi";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { deleteComment } from "@ecp.eth/sdk/comments";
import { waitForTransactionReceipt } from "@wagmi/core";
import { TX_RECEIPT_TIMEOUT } from "@/constants";
import { useReactionRemoval } from "@ecp.eth/shared/hooks";
import { COMMENT_MANAGER_ADDRESS } from "@/wagmi/config";
import { useMutation, type QueryKey } from "@tanstack/react-query";
import type { Hex } from "@ecp.eth/sdk/core";
import type { Comment } from "@ecp.eth/shared/schemas";

type UnlikeCommentProps = {
  comment: Comment;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useUnlikeComment() {
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();
  const unlikeReactionRemoval = useReactionRemoval(
    COMMENT_REACTION_LIKE_CONTENT,
  );

  return useMutation({
    mutationFn: async ({
      comment,
      queryKey,
      onStart,
      onSuccess,
      onError,
    }: UnlikeCommentProps) => {
      let reactionRemovelParams:
        | {
            queryKey: QueryKey;
            reactionId: Hex;
            parentCommentId: Hex;
          }
        | undefined;
      try {
        const reactions =
          comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT] ?? [];

        const reaction = reactions[reactions.length - 1];

        if (!reaction) {
          throw new Error("Reaction not found");
        }

        reactionRemovelParams = {
          queryKey,
          reactionId: reaction.id,
          parentCommentId: comment.id,
        };

        const { txHash } = await deleteComment({
          commentsAddress: COMMENT_MANAGER_ADDRESS,
          commentId: reaction.id,
          writeContract: writeContractAsync,
        });

        unlikeReactionRemoval.start(reactionRemovelParams);

        onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        unlikeReactionRemoval.success(reactionRemovelParams);

        onSuccess?.();
      } catch (e) {
        onError?.(e as Error);

        if (reactionRemovelParams) {
          unlikeReactionRemoval.error(reactionRemovelParams);
        }

        throw e;
      }
    },
  });
}
