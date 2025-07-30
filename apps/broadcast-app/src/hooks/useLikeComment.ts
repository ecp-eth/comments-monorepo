import type {
  IndexerAPICommentReactionSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
} from "@ecp.eth/sdk/indexer";
import { useConfig, useWriteContract } from "wagmi";
import { COMMENT_REACTION_LIKE_CONTENT } from "@ecp.eth/shared/constants";
import { signCommentOrReaction } from "@/api/sign-comment-or-reaction";
import { COMMENT_TYPE_REACTION, SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { postComment } from "@ecp.eth/sdk/comments";
import { waitForTransactionReceipt } from "@wagmi/core";
import { TX_RECEIPT_TIMEOUT } from "@/constants";
import { useReactionSubmission } from "@ecp.eth/shared/hooks";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { chain } from "@/wagmi/config";
import { useMutation, type QueryKey } from "@tanstack/react-query";
import type { Hex } from "@ecp.eth/sdk/core";

type LikeCommentProps = {
  address: Hex;
  comment:
    | IndexerAPICommentWithRepliesSchemaType
    | IndexerAPICommentReactionSchemaType;
  /**
   * Query key to a query where comment is stored
   */
  queryKey: QueryKey;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useLikeComment() {
  const wagmiConfig = useConfig();
  const { writeContractAsync } = useWriteContract();
  const likeReactionSubmission = useReactionSubmission(
    COMMENT_REACTION_LIKE_CONTENT,
  );

  return useMutation({
    mutationFn: async ({
      address,
      comment,
      queryKey,
      onStart,
      onSuccess,
      onError,
    }: LikeCommentProps) => {
      let pendingOperation: PendingPostCommentOperationSchemaType | undefined;

      try {
        if (
          comment.viewerReactions?.[COMMENT_REACTION_LIKE_CONTENT]?.length > 0
        ) {
          throw new Error("Comment already liked");
        }

        const signedCommentResponse = await signCommentOrReaction({
          author: address,
          channelId: comment.channelId,
          content: COMMENT_REACTION_LIKE_CONTENT,
          commentType: COMMENT_TYPE_REACTION,
          metadata: [],
          parentId: comment.id,
        });

        const { txHash } = await postComment({
          commentsAddress: SUPPORTED_CHAINS[chain.id].commentManagerAddress,
          appSignature: signedCommentResponse.signature,
          comment: signedCommentResponse.data,
          writeContract: writeContractAsync,
        });

        pendingOperation = {
          action: "post",
          type: "non-gasless",
          txHash:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          chainId: chain.id,
          state: {
            status: "pending",
          },
          references: [],
          response: signedCommentResponse,
        };

        likeReactionSubmission.start({
          pendingOperation,
          queryKey,
        });

        onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        likeReactionSubmission.success({
          pendingOperation,
          queryKey,
        });

        onSuccess?.();
      } catch (e) {
        onError?.(e as Error);

        if (pendingOperation) {
          likeReactionSubmission.error({
            pendingOperation,
            queryKey,
          });
        }

        throw e;
      }
    },
  });
}
