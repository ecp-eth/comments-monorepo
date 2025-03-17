"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Comment } from "./Comment";
import { CommentForm } from "./CommentForm";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import {
  useHandleCommentDeleted,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useNewCommentsChecker,
} from "./hooks";
import { Button } from "../ui/button";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk";
import {
  CommentPageSchema,
  ListCommentsQueryPageParamsSchemaType,
  type CommentPageSchemaType,
} from "@/lib/schemas";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";
import { publicEnv } from "@/publicEnv";

type CommentSectionProps = {
  initialData?: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >;
};

export function CommentSection({ initialData }: CommentSectionProps) {
  useAutoBodyMinHeight();
  const { targetUri, currentTimestamp } = useEmbedConfig();
  const queryKey = useMemo(() => ["comments", targetUri], [targetUri]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: {
        cursor: undefined,
        limit: COMMENTS_PER_PAGE,
      } as ListCommentsQueryPageParamsSchemaType,
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          targetUri,
          limit: pageParam.limit,
          cursor: pageParam.cursor,
          signal,
        });

        return CommentPageSchema.parse(response);
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      getNextPageParam(
        lastPage
      ): ListCommentsQueryPageParamsSchemaType | undefined {
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
    queryData: data,
    queryKey,
    fetchComments(options) {
      return fetchComments({
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        targetUri,
        limit: COMMENTS_PER_PAGE,
        cursor: options.cursor,
        signal: options.signal,
        sort: "asc",
      });
    },
  });

  const handleCommentDeleted = useHandleCommentDeleted({
    queryKey,
  });
  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({ queryKey });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        description="Failed to load comments. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      <div className="mb-4">
        <CommentForm onSubmitSuccess={handleCommentSubmitted} />
      </div>
      {hasNewComments && (
        <Button
          className="mb-4"
          onClick={() => fetchNewComments()}
          variant="secondary"
          size="sm"
        >
          Load new comments
        </Button>
      )}
      {results.map((comment) => (
        <Comment
          comment={comment}
          key={comment.id}
          onDelete={handleCommentDeleted}
          onRetryPost={handleRetryPostComment}
          currentTimestamp={currentTimestamp}
        />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load more
        </Button>
      )}
    </div>
  );
}
