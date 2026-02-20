import { useConsumePendingWalletConnectionActions } from "@ecp.eth/shared/components";
import { useCallback, useEffect, useRef, useState } from "react";
import { ContractFunctionExecutionError } from "viem";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { toast } from "sonner";
import { type Comment } from "@ecp.eth/shared/schemas";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { useReactComment } from "./useReactComment";
import { useUnreactComment } from "./useUnreactComment";

type UseSetupPendingActionProps = {
  comment: Comment;
  queryKey: readonly unknown[];
};

/**
 * helper hook to setup pending actions for a comment
 */
export function useSetupPendingAction({
  comment,
  queryKey,
}: UseSetupPendingActionProps) {
  const isMountedRef = useRef(false);
  const [isReplying, setIsReplying] = useState(false);
  const [pendingReactions, setPendingReactions] = useState<
    Record<string, boolean>
  >({});

  const reactComment = useReactComment();
  const unreactComment = useUnreactComment();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setReactionPending = useCallback(
    (reactionType: string, nextValue: boolean) => {
      if (!isMountedRef.current) {
        return;
      }

      setPendingReactions((prev) => {
        if (nextValue) {
          return {
            ...prev,
            [reactionType]: true,
          };
        }

        if (!prev[reactionType]) {
          return prev;
        }

        const next = { ...prev };
        delete next[reactionType];

        return next;
      });
    },
    [],
  );

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const formatError = useCallback((error: unknown, fallbackMessage: string) => {
    if (!(error instanceof Error)) {
      return fallbackMessage;
    }

    if (error instanceof ContractFunctionExecutionError) {
      return formatContractFunctionExecutionError(error);
    }

    return error.message;
  }, []);

  const onReactAction = useCallback(
    async (_commentId: Hex, reactionType: string) => {
      if (pendingReactions[reactionType]) {
        return;
      }

      try {
        await reactComment({
          comment,
          queryKey,
          reactionType,
          onBeforeStart: () => setReactionPending(reactionType, true),
          onSuccess: () => setReactionPending(reactionType, false),
          onFailed: (error) => {
            setReactionPending(reactionType, false);
            toast.error(
              formatError(error, `Failed to react with ${reactionType}`),
            );
          },
        });
      } catch {
        // Error already handled by onFailed callback
      }
    },
    [
      comment,
      formatError,
      pendingReactions,
      queryKey,
      reactComment,
      setReactionPending,
    ],
  );

  const onUnreactAction = useCallback(
    async (_commentId: Hex, reactionType: string) => {
      if (pendingReactions[reactionType]) {
        return;
      }

      try {
        await unreactComment({
          comment,
          queryKey,
          reactionType,
          onBeforeStart: () => setReactionPending(reactionType, true),
          onSuccess: () => setReactionPending(reactionType, false),
          onFailed: (error) => {
            setReactionPending(reactionType, false);
            toast.error(
              formatError(error, `Failed to remove ${reactionType} reaction`),
            );
          },
        });
      } catch {
        // Error already handled by onFailed callback
      }
    },
    [
      comment,
      formatError,
      pendingReactions,
      queryKey,
      setReactionPending,
      unreactComment,
    ],
  );

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: (commentId) => onReactAction(commentId, "like"),
    onUnlikeAction: (commentId) => onUnreactAction(commentId, "like"),
    onReactAction,
    onUnreactAction,
    onPrepareReplyAction: onReplyClick,
  });

  return {
    isReactionPending: (reactionType: string) =>
      !!pendingReactions[reactionType],
    isReplying,
    setIsReplying: (value: boolean) => {
      if (!isMountedRef.current) {
        return;
      }

      setIsReplying(value);
    },
  };
}
