"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchComments } from "@ecp.eth/sdk";
import { useEffect, useMemo, useState } from "react";
import { publicEnv } from "@/publicEnv";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useNewCommentsChecker } from "@ecp.eth/shared/hooks";
import type { Hex } from "viem";
import { CommentForm } from "./CommentForm";
import { CommentSectionWrapper } from "../core/CommentSectionWrapper";
import { useAccount } from "wagmi";
import { CommentItem } from "../core/CommentItem";

export function CommentSection() {
  const { address: viewer } = useAccount();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(
    () => ["comments", currentUrl, viewer],
    [currentUrl, viewer]
  );

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isLoading, error, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: ({ pageParam, signal }) => {
        return fetchComments({
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          targetUri: currentUrl,
          cursor: pageParam.cursor,
          limit: pageParam.limit,
          signal,
          viewer,
          mode: "flat",
        });
      },
      enabled: !!currentUrl,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
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
    queryData: data,
    queryKey,
    fetchComments({ cursor, signal }) {
      return fetchComments({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        limit: COMMENTS_PER_PAGE,
        cursor,
        sort: "asc",
        signal,
        viewer,
        mode: "flat",
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

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
    <CommentSectionWrapper>
      <h2 className="text-lg font-semibold mb-4">Comments</h2>
      <CommentForm queryKey={queryKey} />
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
        <CommentItem
          key={`${comment.id}-${comment.deletedAt}`}
          comment={comment}
          connectedAddress={viewer}
        />
      ))}
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
          Load More
        </Button>
      )}
    </CommentSectionWrapper>
  );
}
