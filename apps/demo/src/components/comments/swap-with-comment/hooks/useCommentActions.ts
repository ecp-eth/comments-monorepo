import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import { concat, numberToHex, size } from "viem";
import {
  useSendTransaction,
  useSwitchChain,
  useSignTypedData,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import {
  useCommentDeletion,
  useCommentSubmission,
} from "@ecp.eth/shared/hooks";
import { submitCommentMutationFunction } from "../../standard/queries";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import type { QuoteResponseLiquidityAvailableSchemaType } from "../0x/schemas";
import { TX_RECEIPT_TIMEOUT } from "@/lib/constants";
import { useDeleteCommentAsAuthor } from "@ecp.eth/sdk/comments/react";

export type SwapWithCommentExtra = {
  quote: QuoteResponseLiquidityAvailableSchemaType;
};

export function useCommentActions(): CommentActionsContextType<SwapWithCommentExtra> {
  const wagmiConfig = useConfig();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const commentDeletion = useCommentDeletion();
  const commentSubmission = useCommentSubmission();
  const { mutateAsync: deleteCommentAsAuthor } = useDeleteCommentAsAuthor();
  const deleteComment = useCallback<OnDeleteComment>(
    async (params) => {
      try {
        const { txHash } = await deleteCommentAsAuthor({
          commentId: params.comment.id,
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

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
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
    [wagmiConfig, commentDeletion]
  );

  const retryPostComment = useCallback<OnRetryPostComment>(async () => {
    throw new Error(
      "Retrying post with swapping is not possible at the moment."
    );
  }, []);

  const postComment = useCallback<OnPostComment<SwapWithCommentExtra>>(
    async (params) => {
      const { comment } = params;

      if (!params.extra) {
        throw new Error("Missing extra data");
      }

      const { quote } = params.extra;

      // (1) Sign the Permit2 EIP-712 message returned from quote
      const signature = await signTypedDataAsync(quote.permit2.eip712);

      // (2) Append signature length and signature data to calldata
      const signatureLengthInHex = numberToHex(size(signature), {
        signed: false,
        size: 32,
      });

      const transactionData = quote.transaction.data;
      const sigLengthHex = signatureLengthInHex;
      const sig = signature;

      const pendingOperation = await submitCommentMutationFunction({
        address: params.address,
        commentRequest: {
          content: comment.content,
          ...("parentId" in comment
            ? {
                parentId: comment.parentId,
              }
            : {
                targetUri: comment.targetUri,
              }),
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        async writeContractAsync({ chainId }) {
          // TODO: to be replaced with EIP 7702
          // const commentDataSuffix = createCommentSuffixData({
          //   commentData: _params.data,
          //   appSignature: _params.signature,
          // });

          quote.transaction.data = concat([
            transactionData,
            sigLengthHex,
            sig,
            // commentDataSuffix,
          ]);

          return sendTransactionAsync({
            account: params.address,
            to: quote.transaction.to,
            data: quote.transaction.data,
            value: quote.transaction.value,
            chainId,
          });
        },
      });

      try {
        commentSubmission.start({
          ...params,
          pendingOperation,
        });

        params.onStart?.();

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
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
    [wagmiConfig, commentSubmission]
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
