"use client";

import React from "react";
import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import {
  fetchComment,
  fetchCommentReplies,
  FetchCommentRepliesOptions,
} from "@ecp.eth/sdk/indexer";
import {
  type CommentPageSchemaType,
  CommentPageSchema,
  ListCommentsQueryPageParamsSchemaType,
} from "@ecp.eth/shared/schemas";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { publicEnv } from "@/publicEnv";
import { PoweredBy } from "@ecp.eth/shared/components";
import {
  EmbedConfigProviderByRepliesConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { useAccount, useChainId } from "wagmi";
import { CommentForm } from "./CommentForm";
import { CommentItem } from "./CommentItem";
import { createCommentItemsQueryKey } from "./queries";
import {
  useIsAccountStatusResolved,
  useNewCommentsChecker,
} from "@ecp.eth/shared/hooks";
import { useSyncViewerCookie } from "@/hooks/useSyncViewerCookie";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";
import { Loader2Icon } from "lucide-react";

type QueryData = InfiniteData<
  CommentPageSchemaType,
  ListCommentsQueryPageParamsSchemaType
>;

type CommentSectionRepliesProps = {
  commentId: Hex;
  initialData?: QueryData;
  fetchCommentRepliesParams: FetchCommentRepliesOptions;
};

export function CommentSectionReplies({
  initialData,
  commentId,
  fetchCommentRepliesParams,
}: CommentSectionRepliesProps) {
  useSyncViewerCookie();
  useAutoBodyMinHeight();

  const { address: connectedAddress } = useAccount();
  const isAccountStatusResolved = useIsAccountStatusResolved();
  const { disablePromotion } =
    useEmbedConfig<EmbedConfigProviderByRepliesConfig>();
  const chainId = useChainId();
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(connectedAddress, chainId, commentId),
    [connectedAddress, chainId, commentId],
  );

  const {
    data: selectedComment,
    isPending: selectedCommentPending,
    isError: selectedCommentError,
  } = useQuery({
    queryKey: ["replies-by-comment", chainId, commentId],
    queryFn: async () => {
      return await fetchComment({
        chainId,
        commentId,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
      });
    },
  });

  const {
    data,
    isPending: isRepliesPending,
    error: repliesError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    enabled: isAccountStatusResolved,
    queryKey,
    initialData,
    initialPageParam: initialData?.pageParams[0] || {
      cursor: undefined,
      limit: COMMENTS_PER_PAGE,
    },
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchCommentReplies({
        ...fetchCommentRepliesParams,
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        viewer: connectedAddress,
        signal,
      });

      return CommentPageSchema.parse(response);
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
    enabled: isAccountStatusResolved && !!selectedComment,
    queryData: data,
    queryKey,
    fetchComments(options) {
      return fetchCommentReplies({
        ...fetchCommentRepliesParams,
        mode: selectedComment?.parentId ? "nested" : "flat",
        cursor: options.cursor,
        signal: options.signal,
        viewer: connectedAddress,
        sort: "asc",
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  const isPreparing =
    selectedCommentPending || isRepliesPending || !isAccountStatusResolved;
  const error = repliesError || selectedCommentError;

  if (isPreparing) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ErrorScreen
        description="Failed to load replies. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      <div className="mb-4">
        <CommentForm
          placeholder="What are your thoughts?"
          parentId={commentId}
          queryKey={queryKey}
        />
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
      {results.length === 0 && <NoCommentsScreen />}
      {results.map((comment) => (
        <CommentItem comment={comment} key={comment.id} />
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
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
