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
import { useAccount, useCapabilities, useChainId } from "wagmi";
import { CommentItem } from "../core/CommentItem";
import { createRootCommentsQueryKey } from "../core/queries";
import { CommentActionsProvider } from "../core/CommentActionsContext";
import { useCommentActions } from "./hooks/useCommentActions";

export function CommentSection() {
  const { address: viewer } = useAccount();
  const chainId = useChainId();
  const { data: capabilities } = useCapabilities();
  const isAccountStatusResolved = useIsAccountStatusResolved();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(
    () => createRootCommentsQueryKey(viewer, currentUrl),
    [currentUrl, viewer],
  );

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const { data, isSuccess, error, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      enabled: isAccountStatusResolved && !!currentUrl,
      queryKey,
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: ({ pageParam, signal }) => {
        return fetchComments({
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          targetUri: currentUrl,
          cursor: pageParam.cursor,
          limit: pageParam.limit,
          signal,
          viewer,
          mode: "flat",
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
    fetchComments({ cursor, signal }) {
      return fetchComments({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
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

  const commentActions = useCommentActions({
    connectedAddress: viewer,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  const isEIP7702Supported =
    !!capabilities && capabilities[chainId]?.atomic?.status === "supported";

  return (
    <CommentActionsProvider value={commentActions}>
      <CommentSectionWrapper>
        <h2 className="text-lg font-semibold mb-4">Comments</h2>
        {!isEIP7702Supported && (
          <div className="text-red-500">
            Your wallet doesn&apos;t support atomic transactions
          </div>
        )}
        <CommentForm disabled={!isEIP7702Supported} />
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
                connectedAddress={viewer}
              />
            ))}
            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                variant="secondary"
                size="sm"
              >
                Load More
              </Button>
            )}
          </>
        )}
      </CommentSectionWrapper>
    </CommentActionsProvider>
  );
}
