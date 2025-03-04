"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";
import { Comment } from "./Comment";
import { CommentForm } from "./CommentForm";
import { useAccount } from "wagmi";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import {
  useHandleCommentDeleted,
  useHandleCommentPostedSuccessfully,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
} from "./hooks";
import { Button } from "../ui/button";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { fetchComments } from "@ecp.eth/sdk";
import { CommentPageSchema, type CommentPageSchemaType } from "@/lib/schemas";
import { useCommentsContext } from "@/providers/comments-provider";
import { env } from "@/env";

type CommentSectionProps = {
  initialData?: InfiniteData<
    CommentPageSchemaType,
    { offset: number; limit: number }
  >;
};

export function CommentSection({ initialData }: CommentSectionProps) {
  const { targetUri } = useCommentsContext();
  const account = useAccount();
  const queryKey = useMemo(() => ["comments", targetUri], [targetUri]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialData,
      initialPageParam: {
        offset: 0,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const response = await fetchComments({
          appSigner: env.PLASMO_PUBLIC_APP_SIGNER_ADDRESS,
          apiUrl: env.PLASMO_PUBLIC_COMMENTS_INDEXER_URL,
          targetUri,
          limit: pageParam.limit,
          offset: pageParam.offset,
          signal,
        });

        return CommentPageSchema.parse(response);
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      getNextPageParam(lastPage) {
        if (!lastPage.pagination.hasMore) {
          return;
        }

        return {
          offset: lastPage.pagination.offset + lastPage.pagination.limit,
          limit: lastPage.pagination.limit,
        };
      },
    });

  const handleCommentDeleted = useHandleCommentDeleted({
    queryKey,
  });
  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey,
  });
  const handleCommentPostedSuccessfully = useHandleCommentPostedSuccessfully({
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
      <div className="mb-4 relative">
        {!account.address && (
          <div className="flex items-center justify-center absolute -top-1 -left-1 -bottom-1 -right-1 border rounded-md backdrop-blur-sm z-10">
            <ConnectButton />
          </div>
        )}
        <CommentForm onSubmitSuccess={handleCommentSubmitted} />
      </div>
      {results.map((comment) => (
        <Comment
          comment={comment}
          key={comment.id}
          onDelete={handleCommentDeleted}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
        />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load More
        </Button>
      )}
    </div>
  );
}
