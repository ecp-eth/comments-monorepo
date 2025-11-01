import {
  MAX_INITIAL_REPLIES_ON_PARENT_COMMENT,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import {
  type Comment as CommentType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import { cn } from "@/lib/utils";
import { publicEnv } from "@/publicEnv";
import { fetchCommentReplies } from "@ecp.eth/sdk/indexer";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { ContractFunctionExecutionError } from "viem";
import { Comment } from "./Comment";
import { useCommentActions } from "./CommentActionsContext";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { ReplyItem } from "./ReplyItem";
import {
  createReplyItemsQueryKey,
  createCommentItemsQueryKey,
} from "./queryKeys";
import { chain } from "@/lib/clientWagmi";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import {
  CommentActionButton,
  useConsumePendingWalletConnectionActions,
} from "@ecp.eth/shared/components";
import { Loader2Icon } from "lucide-react";

type CommentItemProps = {
  comment: CommentType;
};

export function CommentItem({ comment }: CommentItemProps) {
  const {
    deleteComment,
    retryPostComment,
    retryEditComment,
    likeComment,
    unlikeComment,
  } = useCommentActions();
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const rootQueryKey = useMemo(
    () => createCommentItemsQueryKey(connectedAddress, window.location.href),
    [connectedAddress],
  );
  const queryKey = useMemo(
    () => createReplyItemsQueryKey(connectedAddress, comment.id),
    [comment.id, connectedAddress],
  );

  const onReplyClick = useCallback(() => {
    setIsReplying(true);
  }, []);

  const onEditClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onDeleteClick = useCallback(() => {
    deleteComment({ comment, queryKey: rootQueryKey });
  }, [comment, deleteComment, rootQueryKey]);

  const onRetryPostClick = useCallback(() => {
    retryPostComment({ comment, queryKey: rootQueryKey });
  }, [comment, retryPostComment, rootQueryKey]);

  const onRetryEditClick = useCallback(() => {
    retryEditComment({ comment, queryKey: rootQueryKey });
  }, [comment, retryEditComment, rootQueryKey]);

  const onLikeClick = useCallback(() => {
    likeComment({
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
  }, [comment, likeComment, rootQueryKey]);

  const onUnlikeClick = useCallback(() => {
    unlikeComment({
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
  }, [comment, unlikeComment, rootQueryKey]);

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
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        chainId: chain.id,
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
    refetch: repliesQuery.refetch,
    fetchComments({ cursor, signal }) {
      return fetchCommentReplies({
        chainId: chain.id,
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
    <div className={cn("mb-4 border-gray-200")}>
      {isEditing ? (
        <CommentEditForm
          comment={comment}
          queryKey={rootQueryKey}
          onCancel={() => {
            setIsEditing(false);
          }}
          onSubmitStart={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <Comment
          comment={comment}
          onRetryPostClick={onRetryPostClick}
          onDeleteClick={onDeleteClick}
          onRetryDeleteClick={onDeleteClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
          isLiking={isLiking}
          optimisticReferences={
            comment.pendingOperation && "references" in comment.pendingOperation
              ? comment.pendingOperation.references
              : undefined
          }
        />
      )}
      {isReplying && (
        <CommentForm
          autoFocus
          onCancel={() => {
            setIsReplying(false);
          }}
          onSubmitStart={() => {
            setIsReplying(false);
          }}
          parentId={comment.id}
          queryKey={queryKey}
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
          key={`${reply.id}-${reply.deletedAt}`}
          comment={reply}
          queryKey={queryKey}
        />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="mb-2">
          <CommentActionButton
            className="gap-2"
            disabled={repliesQuery.isFetchingNextPage}
            onClick={() => repliesQuery.fetchNextPage()}
          >
            {repliesQuery.isFetchingNextPage ? (
              <>
                <Loader2Icon className="animate-spin h-4 w-4" /> loading...
              </>
            ) : (
              "show more replies"
            )}
          </CommentActionButton>
        </div>
      )}
    </div>
  );
}
