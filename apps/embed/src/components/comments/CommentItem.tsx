import {
  CommentPageSchema,
  type Comment as CommentType,
} from "@ecp.eth/shared/schemas";
import { CommentActionButton } from "./CommentActionButton";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";
import { publicEnv } from "@/publicEnv";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { ContractFunctionExecutionError } from "viem";
import {
  MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { Comment } from "./Comment";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { ReplyItem } from "./ReplyItem";
import { useDeleteComment } from "./hooks/useDeleteComment";
import { useRetryPostComment } from "./hooks/useRetryPostComment";
import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
} from "./queries";
import {
  useEmbedConfig,
  type EmbedConfigProviderByTargetURIConfig,
} from "../EmbedConfigProvider";
import { useRetryEditComment } from "./hooks/useRetryEditComment";
import { useAccount, useChainId } from "wagmi";
import { useLikeComment } from "./hooks/useLikeComment";
import { useUnlikeComment } from "./hooks/useUnlikeComment";
import { toast } from "sonner";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useConsumePendingWalletConnectionActions } from "@ecp.eth/shared/components";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";

type CommentItemProps = {
  comment: CommentType;
};

export function CommentItem({ comment }: CommentItemProps) {
  const { address: connectedAddress } = useAccount();
  const { targetUri } = useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({
    connectedAddress,
  });
  const retryEditComment = useRetryEditComment({
    connectedAddress,
  });
  const likeComment = useLikeComment();
  const unlikeComment = useUnlikeComment();
  const [isLiking, setIsLiking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const chainId = useChainId();
  const queryKey = useMemo(
    () => createCommentRepliesQueryKey(connectedAddress, chainId, comment.id),
    [comment.id, connectedAddress, chainId],
  );
  const rootQueryKey = useMemo(
    () => createRootCommentsQueryKey(connectedAddress, chainId, targetUri),
    [targetUri, connectedAddress, chainId],
  );

  const repliesQuery = useInfiniteQuery({
    enabled: comment.pendingOperation?.action !== "post",
    queryKey,
    initialData: comment.replies
      ? {
          pages: [comment.replies],
          pageParams: [
            {
              cursor: comment.replies.pagination.endCursor,
              limit: comment.replies.pagination.limit,
            },
          ],
        }
      : undefined,
    initialPageParam: {
      cursor: comment.replies?.pagination.endCursor,
      limit:
        comment.replies?.pagination.limit ??
        MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchCommentReplies({
        chainId,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        commentId: comment.id,
        signal,
        viewer: connectedAddress,
        mode: comment.parentId ? undefined : "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });

      return CommentPageSchema.parse(response);
    },
    getNextPageParam(lastPage) {
      if (!lastPage.pagination.hasNext) {
        return;
      }

      return {
        cursor: lastPage.pagination.endCursor,
        limit: lastPage.pagination.limit,
      };
    },
  });

  const { hasNewComments, fetchNewComments } = useNewCommentsChecker({
    enabled: comment.pendingOperation?.action !== "post",
    queryData: repliesQuery.data,
    queryKey,
    fetchComments({ cursor, signal }) {
      return fetchCommentReplies({
        chainId,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        commentId: comment.id,
        cursor,
        limit: 10,
        sort: "asc",
        signal,
        viewer: connectedAddress,
        mode: comment.parentId ? undefined : "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const onDeleteClick = useCallback(() => {
    deleteComment({
      commentId: comment.id,
      queryKey: rootQueryKey,
    });
  }, [comment, deleteComment, rootQueryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey: rootQueryKey });
  }, [comment, retryPostComment, rootQueryKey]);

  const onRetryEditClick = useCallback(() => {
    retryEditComment({ comment, queryKey: rootQueryKey });
  }, [comment, retryEditComment, rootQueryKey]);

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onLikeClick = useCallback(async () => {
    setIsLiking(true);
    try {
      await likeComment({
        comment,
        queryKey: rootQueryKey,
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
  }, [likeComment, comment, rootQueryKey]);

  const onUnlikeClick = useCallback(async () => {
    setIsLiking(true);
    try {
      await unlikeComment({
        comment,
        queryKey: rootQueryKey,
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
  }, [unlikeComment, comment, rootQueryKey]);

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  useConsumePendingWalletConnectionActions({
    commentId: comment.id,
    onLikeAction: onLikeClick,
    onUnlikeAction: onUnlikeClick,
    onPrepareReplyAction: onReplyClick,
  });

  return (
    <div className="mb-4 border-muted">
      {isEditing ? (
        <CommentEditForm
          comment={comment}
          queryKey={rootQueryKey}
          onCancel={() => setIsEditing(false)}
          onSubmitStart={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <Comment
          key={`${comment.id}-${comment.deletedAt}`}
          comment={comment}
          onDeleteClick={onDeleteClick}
          onRetryDeleteClick={onDeleteClick}
          onRetryPostClick={onRetryPostClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
          optimisticReferences={
            comment.pendingOperation?.action === "post"
              ? comment.pendingOperation.references
              : undefined
          }
          isLiking={isLiking}
        />
      )}
      {isReplying && (
        <CommentForm
          onCancel={() => setIsReplying(false)}
          onSubmitStart={() => {
            setIsReplying(false);
          }}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
      {hasNewComments && (
        <div className="mb-2">
          <CommentActionButton onClick={() => fetchNewComments()}>
            show new replies
          </CommentActionButton>
        </div>
      )}
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          comment={reply}
          queryKey={queryKey}
          parentCommentId={comment.id}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="mb-2">
          <CommentActionButton onClick={() => repliesQuery.fetchNextPage()}>
            show more replies
          </CommentActionButton>
        </div>
      )}
    </div>
  );
}
