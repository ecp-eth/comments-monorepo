"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import { useEffect, useMemo, useState } from "react";
import { publicEnv } from "@/publicEnv";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  useNewCommentsChecker,
  useIsAccountStatusResolved,
} from "@ecp.eth/shared/hooks";
import type { Hex } from "viem";
import { CommentForm } from "./CommentForm";
import { CommentSectionWrapper } from "../core/CommentSectionWrapper";
import { useAccount } from "wagmi";
import { CommentItem } from "../core/CommentItem";
import { createCommentItemsQueryKey } from "../core/queryKeys";
import { useCommentActions } from "./hooks/useCommentActions";
import { CommentActionsProvider } from "./context";
import { chain } from "@/lib/clientWagmi";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { Heading2 } from "../core/Heading2";
import { LoadingScreen } from "../core/LoadingScreen";
import { Loader2Icon } from "lucide-react";

export function CommentSection() {
  const { address: viewer } = useAccount();
  const isAccountStatusResolved = useIsAccountStatusResolved();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(viewer, currentUrl),
    [currentUrl, viewer],
  );

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const {
    data,
    isSuccess,
    error,
    hasNextPage,
    fetchNextPage,
    isPending,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    enabled: isAccountStatusResolved && !!currentUrl,
    queryKey,
    initialPageParam: {
      cursor: undefined as Hex | undefined,
      limit: COMMENTS_PER_PAGE,
    },
    queryFn: ({ pageParam, signal }) => {
      return fetchComments({
        chainId: chain.id,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        signal,
        viewer,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
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
    enabled: isAccountStatusResolved && !!currentUrl,
    queryData: data,
    queryKey,
    refetch,
    fetchComments({ cursor, signal }) {
      return fetchComments({
        chainId: chain.id,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        limit: COMMENTS_PER_PAGE,
        cursor,
        sort: "asc",
        signal,
        viewer,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const commentActions = useCommentActions({
    connectedAddress: viewer,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  return (
    <CommentActionsProvider value={commentActions}>
      <CommentSectionWrapper>
        <Heading2>Comments</Heading2>
        <CommentForm queryKey={queryKey} />
        {isPending && <LoadingScreen />}
        {error && <div>Error loading comments: {(error as Error).message}</div>}
        {isSuccess && (
          <>
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
              />
            ))}
            {hasNextPage && (
              <Button
                className="gap-2"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                variant="secondary"
                size="sm"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2Icon className="animate-spin h-4 w-4" /> Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            )}
          </>
        )}
      </CommentSectionWrapper>
    </CommentActionsProvider>
  );
}
