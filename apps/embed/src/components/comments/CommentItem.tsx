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
import type { Hex } from "viem";
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
import { useChainId } from "wagmi";

type CommentItemProps = {
  connectedAddress: Hex | undefined;
  comment: CommentType;
};

export function CommentItem({ comment, connectedAddress }: CommentItemProps) {
  const { targetUri } = useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const deleteComment = useDeleteComment();
  const retryPostComment = useRetryPostComment({
    connectedAddress,
  });
  const retryEditComment = useRetryEditComment({
    connectedAddress,
  });
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const chainId = useChainId();
  const queryKey = useMemo(
    () => createCommentRepliesQueryKey(connectedAddress, comment.id),
    [comment.id, connectedAddress],
  );
  const rootQueryKey = useMemo(
    () => createRootCommentsQueryKey(connectedAddress, targetUri),
    [targetUri, connectedAddress],
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
        chainId,
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

  const replies = useMemo(() => {
    return repliesQuery.data?.pages.flatMap((page) => page.results) || [];
  }, [repliesQuery.data?.pages]);

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
          onReplyClick={onReplyClick}
          onEditClick={onEditClick}
          onRetryEditClick={onRetryEditClick}
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
          connectedAddress={connectedAddress}
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
