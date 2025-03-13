"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchComments } from "@ecp.eth/sdk";
import { useEffect, useMemo, useState } from "react";
import { Comment } from "./Comment";
import { CommentBox } from "./CommentBox";
import { publicEnv } from "@/publicEnv";
import { COMMENTS_PER_PAGE } from "@/lib/constants";
import { Button } from "../ui/button";
import {
  useHandleCommentDeleted,
  useHandleCommentPostedSuccessfully,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
} from "./hooks";

export function CommentSection() {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(() => ["comments", currentUrl], [currentUrl]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isLoading, error, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: {
        offset: 0,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: ({ pageParam, signal }) => {
        return fetchComments({
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          targetUri: currentUrl,
          offset: pageParam.offset,
          limit: pageParam.limit,
          signal,
        });
      },
      enabled: !!currentUrl,
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
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error loading comments: {(error as Error).message}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <CommentBox onSubmitSuccess={handleCommentSubmitted} />
      {results.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          onPostSuccess={handleCommentPostedSuccessfully}
          onRetryPost={handleRetryPostComment}
          onDelete={handleCommentDeleted}
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
