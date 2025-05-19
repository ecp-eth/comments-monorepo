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
import type { Hex } from "viem";
import { CommentActionButton } from "./CommentActionButton";
import { Comment } from "./Comment";
import { useCommentActions } from "./CommentActionsContext";
import { CommentEditForm, CommentForm } from "./CommentForm";
import { ReplyItem } from "./ReplyItem";
import {
  createCommentRepliesQueryKey,
  createRootCommentsQueryKey,
} from "./queries";

type CommentItemProps = {
  connectedAddress: Hex | undefined;
  comment: CommentType;
};

export function CommentItem({ comment, connectedAddress }: CommentItemProps) {
  const { deleteComment, retryPostComment, retryEditComment } =
    useCommentActions();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const rootQueryKey = useMemo(
    () => createRootCommentsQueryKey(connectedAddress, window.location.href),
    [connectedAddress]
  );
  const queryKey = useMemo(
    () => createCommentRepliesQueryKey(connectedAddress, comment.id),
    [comment.id, connectedAddress]
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
    retryEditComment({ comment, queryKey });
  }, [comment, retryEditComment, queryKey]);

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
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        commentId: comment.id,
        signal,
        viewer: connectedAddress,
        mode: "flat",
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
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        commentId: comment.id,
        cursor,
        limit: 10,
        sort: "asc",
        signal,
        viewer: connectedAddress,
        mode: "flat",
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

  return (
    <div className={cn("mb-4 border-gray-200")}>
      {isEditing ? (
        <CommentEditForm
          comment={comment}
          queryKey={rootQueryKey}
          key={`${comment.id}-${comment.deletedAt}-edit`}
          onCancel={() => {
            setIsEditing(false);
          }}
          onSubmitStart={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <Comment
          key={`${comment.id}-${comment.deletedAt}`}
          comment={comment}
          onReplyClick={onReplyClick}
          onRetryPostClick={onRetryPostClick}
          onDeleteClick={onDeleteClick}
          onRetryDeleteClick={onDeleteClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
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
          <CommentActionButton onClick={() => repliesQuery.fetchNextPage()}>
            show more replies
          </CommentActionButton>
        </div>
      )}
    </div>
  );
}
