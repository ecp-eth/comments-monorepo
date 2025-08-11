import { useConsumePendingWalletConnectionActions } from "@ecp.eth/shared/components";
import { useLikeComment } from "./useLikeComment";
import { useUnlikeComment } from "./useUnlikeComment";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContractFunctionExecutionError } from "viem";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { toast } from "sonner";
import { type Comment } from "@ecp.eth/shared/schemas";

type UseLikeReactionSetupProps = {
  comment: Comment;
  queryKey: readonly unknown[];
};

/**
 * helper hook to setup pending actions for a comment
 */
export function useSetupPendingAction({
  comment,
  queryKey,
}: UseLikeReactionSetupProps) {
  const isMountedRef = useRef(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onLikeClick = useCallback(async () => {
    if (isLiking) {
      return;
    }

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
  }, [isLiking, likeComment, comment, queryKey]);

  const onUnlikeClick = useCallback(async () => {
    await unlikeComment({
      comment,
      queryKey,
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
  }, [unlikeComment, comment, queryKey]);

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: onLikeClick,
    onUnlikeAction: onUnlikeClick,
    onPrepareReplyAction: onReplyClick,
  });

  return {
    isLiking,
    isReplying,
    setIsReplying: (value: boolean) => {
      if (!isMountedRef.current) {
        return;
      }

      setIsReplying(value);
    },
  };
}
