import { useConsumePendingWalletConnectionActions } from "@ecp.eth/shared/components";
import { useLikeComment } from "./useLikeComment";
import { useUnlikeComment } from "./useUnlikeComment";
import { useCallback, useState } from "react";
import { ContractFunctionExecutionError } from "viem";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { toast } from "sonner";
import { type Comment } from "@ecp.eth/shared/schemas";

type UseLikeReactionSetupProps = {
  comment: Comment;
  queryKey: string[];
  onReplyAction?: () => void;
};

/**
 * helper hook to setup pending actions for a comment
 */
export function usePendingActionSetup({
  comment,
  queryKey,
  onReplyAction,
}: UseLikeReactionSetupProps) {
  const [isLiking, setIsLiking] = useState(false);

  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  const onLikeClick = useCallback(async () => {
    setIsLiking(true);
    try {
      await likeComment({
        comment,
        queryKey,
        onBeforeStart: () => setIsLiking(true),
        onSuccess: () => setIsLiking(false),
        onFailed: (e: unknown) => {
          setIsLiking(false);

          if (!(e instanceof Error)) {
            toast.error("Failed to like");
            return;
          }

          const message =
            e instanceof ContractFunctionExecutionError
              ? formatContractFunctionExecutionError(e)
              : e.message;

          toast.error(message);
        },
      });
    } finally {
      setIsLiking(false);
    }
  }, [likeComment, comment, queryKey]);

  const onUnlikeClick = useCallback(async () => {
    setIsLiking(true);
    try {
      await unlikeComment({
        comment,
        queryKey,
        onBeforeStart: () => setIsLiking(false),
        onFailed: (e: unknown) => {
          if (!(e instanceof Error)) {
            toast.error("Failed to unlike");
            return;
          }

          const message =
            e instanceof ContractFunctionExecutionError
              ? formatContractFunctionExecutionError(e)
              : e.message;

          toast.error(message);
        },
      });
    } finally {
      setIsLiking(false);
    }
  }, [unlikeComment, comment, queryKey]);

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: onLikeClick,
    onUnlikeAction: onUnlikeClick,
    onPrepareReplyAction: onReplyAction ?? (() => {}),
  });

  return {
    isLiking,
  };
}
