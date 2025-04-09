import { useCallback, useMemo } from "react";
import type {
  CommentActionsContextType,
  OnDeleteComment,
  OnPostComment,
  OnRetryPostComment,
} from "../../core/CommentActionsContext";
import { concat, numberToHex, size, type Hex } from "viem";
import {
  useConnectorClient,
  useSendTransaction,
  useSwitchChain,
  useSignTypedData,
} from "wagmi";
import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { useCommentDeletion } from "../../core/hooks/useCommentDeletion";
import { useCommentSubmission } from "../../core/hooks/useCommentSubmission";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { submitCommentMutationFunction } from "../../standard/queries";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import type { QuoteResponseLiquidityAvailableSchemaType } from "../0x/schemas";

const TX_RECEIPT_TIMEOUT = 1000 * 60 * 2; // 2 minutes

export type SwapWithCommentExtra = {
  quote: QuoteResponseLiquidityAvailableSchemaType;
};

type UseCommentActionsProps = {
  connectedAddress: Hex | undefined;
};

export function useCommentActions({
  connectedAddress,
}: UseCommentActionsProps): CommentActionsContextType<SwapWithCommentExtra> {
  const { data: client } = useConnectorClient();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const commentDeletion = useCommentDeletion();
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

  const retryPostComment = useCallback<OnRetryPostComment>(async () => {
    throw new Error(
      "Retrying post with swapping is not possible at the moment."
    );
  }, [client]);

  const postComment = useCallback<OnPostComment<SwapWithCommentExtra>>(
    async (params) => {
      if (!client) {
        throw new Error("No connector client");
      }

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
        address: connectedAddress,
        commentRequest: {
          content: comment.content,
          parentId: comment.parentId ?? undefined,
          targetUri: comment.targetUri,
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
            account: connectedAddress,
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
