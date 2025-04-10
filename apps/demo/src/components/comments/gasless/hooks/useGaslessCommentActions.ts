import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import type { Hex } from "viem";
import { useConnectorClient } from "wagmi";
import { getChainId, waitForTransactionReceipt } from "viem/actions";
import {
  useCommentDeletion,
  useCommentRetrySubmission,
  useCommentSubmission,
} from "@ecp.eth/shared/hooks";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { useGaslessSubmitComment } from "./useGaslessSubmitComment";
import { useGaslessDeleteComment } from "./useGaslessDeleteComment";

const TX_RECEIPT_TIMEOUT = 1000 * 60 * 2; // 2 minutes

type UseGaslessCommentActionsProps = {
  connectedAddress: Hex | undefined;
  /**
   * Did user approved the app to do operations on their behalf?
   */
  hasApproval: boolean;
};

export function useGaslessCommentActions({
  connectedAddress,
  hasApproval,
}: UseGaslessCommentActionsProps): CommentActionsContextType {
  const { data: client } = useConnectorClient();
  const deleteCommentMutation = useGaslessDeleteComment({
    connectedAddress,
  });
  const submitCommentMutation = useGaslessSubmitComment();
  const commentDeletion = useCommentDeletion();
  const commentRetrySubmission = useCommentRetrySubmission();
  const commentSubmission = useCommentSubmission();
  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        if (!client) {
          throw new Error("No connector client");
        }

        const txHash = await deleteCommentMutation.mutateAsync({
          comment: params.comment,
          submitIfApproved: hasApproval,
        });

        const chainId = await getChainId(client);

        const pendingOperation: PendingDeleteCommentOperationSchemaType = {
          action: "delete",
          chainId,
          commentId: params.comment.id,
          state: { status: "pending" },
          type: hasApproval ? "gasless-preapproved" : "gasless-not-approved",
          txHash,
        };

        commentDeletion.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(client, {
          hash: txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentDeletion.success({
          queryKey: params.queryKey,
          pendingOperation,
        });
      } catch (e) {
        commentDeletion.error({
          queryKey: params.queryKey,
          commentId: params.comment.id,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client, deleteCommentMutation, hasApproval, commentDeletion]
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

      if (comment.pendingOperation.type === "non-gasless") {
        throw new Error("Only gasless comments can be retried");
      }

      if (comment.pendingOperation.action !== "post") {
        throw new Error("Only post comments can be retried");
      }

      const pendingOperation = await submitCommentMutation.mutateAsync({
        content: comment.content,
        isApproved: comment.pendingOperation.type === "gasless-preapproved",
        targetUri: comment.targetUri,
        parentId: comment.parentId ?? undefined,
      });

      try {
        commentRetrySubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

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
    [client, submitCommentMutation]
  );

  const postComment = useCallback<OnPostComment>(
    async (params) => {
      if (!client) {
        throw new Error("No connector client");
      }

      const pendingOperation = await submitCommentMutation.mutateAsync({
        content: params.comment.content,
        isApproved: hasApproval,
        targetUri: params.comment.targetUri,
        parentId: params.comment.parentId ?? undefined,
      });

      try {
        commentSubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(client, {
          hash: pendingOperation.txHash,
          timeout: TX_RECEIPT_TIMEOUT,
        });

        if (receipt.status !== "success") {
          throw new Error("Transaction reverted");
        }

        commentSubmission.success({
          pendingOperation,
          queryKey: params.queryKey,
        });
      } catch (e) {
        commentSubmission.error({
          queryKey: params.queryKey,
          commentId: pendingOperation.response.data.id,
          error: e instanceof Error ? e : new Error(String(e)),
        });

        throw e;
      }
    },
    [client, hasApproval, commentSubmission]
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
