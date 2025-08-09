"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CommentForm } from "./CommentForm";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import {
  useIsAccountStatusResolved,
  useNewCommentsChecker,
} from "@ecp.eth/shared/hooks";
import { Button } from "../ui/button";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import { fetchComments, FetchCommentsOptions } from "@ecp.eth/sdk/indexer";
import {
  type ListCommentsQueryPageParamsSchemaType,
  type CommentPageSchemaType,
  CommentPageSchema,
} from "@ecp.eth/shared/schemas";
import { useAutoBodyMinHeight } from "@/hooks/useAutoBodyMinHeight";
import { useAccount, useChainId } from "wagmi";
import { PoweredBy } from "@ecp.eth/shared/components";
import { CommentItem } from "./CommentItem";
import { createCommentItemsQueryKey } from "./queries";
import { NoCommentsScreen } from "../NoCommentsScreen";
import { cn } from "@ecp.eth/shared/helpers";
import { useSyncViewerCookie } from "@/hooks/useSyncViewerCookie";
import { Loader2Icon } from "lucide-react";

type CommentSectionProps = {
  initialData?: InfiniteData<
    CommentPageSchemaType,
    ListCommentsQueryPageParamsSchemaType
  >;
  fetchCommentParams: FetchCommentsOptions;
};

export function CommentSection({
  initialData,
  fetchCommentParams,
}: CommentSectionProps) {
  useSyncViewerCookie();
  useAutoBodyMinHeight();

  const chainId = useChainId();

  const { address: connectedAddress } = useAccount();
  const isAccountStatusResolved = useIsAccountStatusResolved();

  const { targetUri, disablePromotion, restrictMaximumContainerWidth } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(connectedAddress, chainId, targetUri),
    [targetUri, connectedAddress, chainId],
  );

  const {
    data,
    isSuccess,
    isPending,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    enabled: isAccountStatusResolved,
    queryKey,
    initialData,
    initialPageParam: {
      cursor: undefined,
      limit: COMMENTS_PER_PAGE,
    } as ListCommentsQueryPageParamsSchemaType,
    queryFn: async ({ pageParam, signal }) => {
      const response = await fetchComments({
        ...fetchCommentParams,
        limit: pageParam.limit,
        cursor: pageParam.cursor,
        viewer: connectedAddress,
        signal,
      });

      return CommentPageSchema.parse(response);
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    getNextPageParam(
      lastPage,
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
    enabled: isAccountStatusResolved,
    queryData: data,
    queryKey,
    fetchComments(options) {
      return fetchComments({
        ...fetchCommentParams,
        sort: "asc",
        limit: COMMENTS_PER_PAGE,
        cursor: options.cursor,
        signal: options.signal,
        viewer: connectedAddress,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  const isPreparing = isPending || !isAccountStatusResolved;

  return (
    <div
      className={cn("mx-auto", restrictMaximumContainerWidth && "max-w-2xl")}
    >
      <h2 className="text-headline font-bold mb-4 text-foreground">Comments</h2>
      <div className="mb-4">
        <CommentForm queryKey={queryKey} />
      </div>
      {isPreparing && <LoadingScreen />}
      {error && (
        <ErrorScreen
          description="Failed to load comments. Please try again."
          onRetry={() => refetch()}
        />
      )}
      {!isPreparing && isSuccess && (
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
                "Load more"
              )}
            </Button>
          )}
        </>
      )}
      {!disablePromotion && <PoweredBy className="mt-4" />}
    </div>
  );
}
