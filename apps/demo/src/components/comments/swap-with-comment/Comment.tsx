import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { useCallback, useEffect, useMemo } from "react";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { publicEnv } from "@/publicEnv";
import type {
  OnDeleteComment,
  OnRetryPostComment,
} from "@ecp.eth/shared/types";
import {
  useHandleCommentDeleted,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useFreshRef,
} from "@ecp.eth/shared/hooks";
import { type Comment as CommentType } from "@/lib/schemas";
import { useMutation } from "@tanstack/react-query";
import { submitCommentMutationFunction } from "../queries";
import never from "never";
import { toast } from "sonner";
import { CommentShared } from "../CommentShared";
import { CommentDefaultForm } from "../CommentDefaultForm";

interface CommentProps {
  comment: CommentType;
  onDelete?: OnDeleteComment;
  /**
   * Called when comment posting to blockchain failed and the transaction has been reverted
   * and user pressed retry.
   */
  onRetryPost: OnRetryPostComment;
  level?: number;
}

export function Comment({
  comment,
  onRetryPost,
  onDelete,
  level = 0,
}: CommentProps) {
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const areRepliesAllowed = level < publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF;
  const submitTargetCommentId = areRepliesAllowed
    ? comment.id
    : (comment.parentId ?? never("parentId is required for comment depth > 0"));
  const submitTargetQueryKey = useMemo(
    () => ["comments", submitTargetCommentId],
    [submitTargetCommentId]
  );
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);

  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey: submitTargetQueryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({
    queryKey: submitTargetQueryKey,
  });
  const handleCommentDeleted = useHandleCommentDeleted({ queryKey });

  const retryPostMutation = useMutation({
    mutationFn: async () => {
      if (!comment.pendingOperation) {
        throw new Error("No pending operation to retry");
      }

      if (comment.pendingOperation.type !== "non-gasless") {
        throw new Error("Only non-gasless comments can be retried");
      }

      return submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId: comment.pendingOperation.chainId,
          content: comment.pendingOperation.response.data.content,
          parentId: comment.pendingOperation.response.data.parentId,
          targetUri: comment.pendingOperation.response.data.targetUri,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(params) {
          return writeContractAsync({
            abi: CommentsV1Abi,
            address: COMMENTS_V1_ADDRESS,
            functionName: "postCommentAsAuthor",
            args: [params.data, params.signature],
          });
        },
      });
    },
    onSuccess(newPendingOperation) {
      onRetryPost(comment, newPendingOperation);
    },
  });

  const deleteCommentContract = useWriteContract();

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash: deleteCommentContract.data,
  });

  const handleDeleteClick = useCallback(() => {
    deleteCommentContract.writeContract({
      address: COMMENTS_V1_ADDRESS,
      abi: CommentsV1Abi,
      functionName: "deleteCommentAsAuthor",
      args: [comment.id],
    });
  }, [comment.id, deleteCommentContract]);

  useEffect(() => {
    if (deleteCommentTransactionReceipt.data?.status === "success") {
      onDeleteRef.current?.(commentRef.current.id);
    }
  }, [deleteCommentTransactionReceipt.data?.status, commentRef, onDeleteRef]);

  const postingCommentTxReceipt = useWaitForTransactionReceipt({
    hash: comment.pendingOperation?.txHash,
    chainId: comment.pendingOperation?.chainId,
  });

  useEffect(() => {
    if (postingCommentTxReceipt.data?.status === "success") {
      toast.success("Comment posted");
    }
  }, [postingCommentTxReceipt.data]);

  const isDeleting =
    deleteCommentTransactionReceipt.isFetching ||
    deleteCommentContract.isPending;
  const didDeletingFailed =
    !isDeleting &&
    (deleteCommentTransactionReceipt.data?.status === "reverted" ||
      deleteCommentContract.isError);

  const isPosting = postingCommentTxReceipt.isFetching;
  const didPostingFailed =
    !isPosting && postingCommentTxReceipt.data?.status === "reverted";

  return (
    <CommentShared
      areRepliesAllowed={areRepliesAllowed}
      comment={comment}
      didDeletingFailed={didDeletingFailed}
      didPostingFailed={didPostingFailed}
      isDeleting={isDeleting}
      isPosting={isPosting}
      onReplyDelete={handleCommentDeleted}
      onReplyPost={handleRetryPostComment}
      onRetryDeleteClick={handleDeleteClick}
      onRetryPostClick={retryPostMutation.mutate}
      onReplySubmitSuccess={handleCommentSubmitted}
      level={level}
      ReplyComponent={Comment}
      ReplyFormComponent={CommentDefaultForm}
      onDeleteClick={handleDeleteClick}
    />
  );
}
