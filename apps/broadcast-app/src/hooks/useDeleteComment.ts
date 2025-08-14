import { COMMENT_MANAGER_ADDRESS } from "@/wagmi/config";
import { deleteComment } from "@ecp.eth/sdk/comments";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useCommentDeletion } from "@ecp.eth/shared/hooks";
import {
  Comment,
  PendingDeleteCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { type QueryKey, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContractFunctionExecutionError } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

export function useDeleteComment() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const commentDeletion = useCommentDeletion();

  return useMutation({
    mutationFn: async ({
      comment,
      queryKey,
    }: {
      comment: Comment;
      queryKey: QueryKey;
    }) => {
      if (!publicClient) {
        throw new Error("Public client not found");
      }

      const { txHash, wait } = await deleteComment({
        commentId: comment.id,
        writeContract: writeContractAsync,
        commentsAddress: COMMENT_MANAGER_ADDRESS,
      });

      await wait({
        getContractEvents: publicClient?.getContractEvents,
        waitForTransactionReceipt: publicClient?.waitForTransactionReceipt,
      });

      const pendingOperation: PendingDeleteCommentOperationSchemaType = {
        action: "delete",
        chainId: comment.chainId,
        commentId: comment.id,
        state: {
          status: "pending",
        },
        txHash,
        type: "non-gasless",
      };

      commentDeletion.start({
        queryKey,
        pendingOperation,
      });

      commentDeletion.success({
        queryKey,
        pendingOperation,
      });
    },
    onSuccess() {
      toast.success("Comment deleted");
    },
    onError(error) {
      const message =
        error instanceof ContractFunctionExecutionError
          ? formatContractFunctionExecutionError(error)
          : "An error occurred while deleting the comment";

      toast.error(message);
    },
  });
}
