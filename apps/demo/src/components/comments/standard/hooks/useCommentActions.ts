import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import type { Hex } from "viem";
import { useConnectorClient, useWriteContract, useSwitchChain } from "wagmi";
import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { useCommentDeletion } from "../../core/hooks/useCommentDeletion";
import { useCommentRetrySubmission } from "../../core/hooks/useCommentRetrySubmission";
import { useCommentSubmission } from "../../core/hooks/useCommentSubmission";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { submitCommentMutationFunction } from "../queries";
import { postCommentAsAuthorViaCommentsV1 } from "@/lib/contract";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";

const TX_RECEIPT_TIMEOUT = 1000 * 60 * 2; // 2 minutes

type UseCommentActionsProps = {
  connectedAddress: Hex | undefined;
};

export function useCommentActions({
  connectedAddress,
}: UseCommentActionsProps): CommentActionsContextType {
  const { data: client } = useConnectorClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const commentDeletion = useCommentDeletion();
  const commentRetrySubmission = useCommentRetrySubmission();
  const commentSubmission = useCommentSubmission();
  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        if (!client) {
          throw new Error("No connector client");
        }

        const txHash = await writeContract(client, {
          address: COMMENTS_V1_ADDRESS,
          abi: CommentsV1Abi,
          functionName: "deleteCommentAsAuthor",
          args: [params.comment.id],
        });

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId: params.comment.chainId,
          commentId: params.comment.id,
          state: { status: "pending" },
          type: "non-gasless",
          txHash,
        };

        commentDeletion.start({
          ...params,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(client, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentDeletion.error({
          commentId: params.comment.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client, commentDeletion]
  );

  const retryPostComment = useCallback<OnRetryPostComment>(
    async (params) => {
      const { comment } = params;

      if (!client) {
        throw new Error("No connector client");
      }

      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "post") {
        throw new Error("Only post comments can be retried");
      }

      const pendingOperation = await submitCommentMutationFunction({
        address: connectedAddress,
        commentRequest: {
          content: comment.content,
          parentId: comment.parentId ?? undefined,
          targetUri: comment.targetUri,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signCommentResponse: { signature: appSignature, data: commentData },
        }) {
          return await postCommentAsAuthorViaCommentsV1(
            { appSignature, commentData },
            writeContractAsync
          );
        },
      });

      try {
        commentRetrySubmission.start({
          ...params,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(client, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentRetrySubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentRetrySubmission.error({
          pendingOperation,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client]
  );

  const postComment = useCallback<OnPostComment>(
    async (params) => {
      if (!client) {
        throw new Error("No connector client");
      }

      const { comment } = params;

      const pendingOperation = await submitCommentMutationFunction({
        address: connectedAddress,
        commentRequest: {
          content: comment.content,
          parentId: comment.parentId ?? undefined,
          targetUri: comment.targetUri,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({
          signCommentResponse: { signature: appSignature, data: commentData },
        }) {
          return await postCommentAsAuthorViaCommentsV1(
            { appSignature, commentData },
            writeContractAsync
          );
        },
      });

      try {
        commentSubmission.start({
          ...params,
          pendingOperation,
        });

        const receipt = await waitForTransactionReceipt(client, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentSubmission.success({
          ...params,
          pendingOperation,
        });
      } catch (e) {
        commentSubmission.error({
          commentId: pendingOperation.response.data.id,
          queryKey: params.queryKey,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client, commentSubmission]
  );

  return useMemo(
    () => ({
      deleteComment,
      retryPostComment,
      postComment,
    }),
    [deleteComment, retryPostComment, postComment]
  );
}
