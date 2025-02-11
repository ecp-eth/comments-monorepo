"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useMemo } from "react";
import { Comment } from "./Comment";
import { CommentForm, type OnSubmitSuccessFunction } from "./CommentForm";
import {
  CommentPageSchema,
  CommentPageSchemaType,
  SignCommentResponseClientSchemaType,
} from "@/lib/schemas";
import { useAccount } from "wagmi";
import { useEmbedConfig } from "../EmbedConfigProvider";
import { ErrorScreen } from "../ErrorScreen";
import { LoadingScreen } from "../LoadingScreen";
import type { Hex } from "@ecp.eth/sdk/schemas";

const COMMENTS_PER_PAGE = 10;

export function CommentSection() {
  const { targetUri } = useEmbedConfig();
  const account = useAccount();

  const client = useQueryClient();
  const queryKey = useMemo(() => ["comments", targetUri], [targetUri]);

  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: {
        offset: 0,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: async ({ pageParam, signal }) => {
        const searchParams = new URLSearchParams({
          targetUri,
          offset: pageParam.offset.toString(),
          limit: pageParam.limit.toString(),
        });

        const response = await fetch(
          `/api/comments?${searchParams.toString()}`,
          {
            signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }

        return CommentPageSchema.parse(await response.json());
      },
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

  const handleCommentDeleted = useCallback(
    (commentId: Hex) => {
      console.log({ commentId });
      /**
       * Mutates the response object to redact the content of the comment with the given ID.
       */
      function deleteComment(
        response: CommentPageSchemaType,
        commentId: Hex
      ): boolean {
        for (const comment of response.results) {
          if (comment.id === commentId) {
            comment.deletedAt = new Date();
            comment.content = "[deleted]";

            return true;
          }

          if (deleteComment(comment.replies, commentId)) {
            return true;
          }
        }

        return false;
      }

      // replace content of the comment with redacted message
      client.setQueryData<typeof data>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        const clonedOldData = structuredClone(oldData);

        for (const page of clonedOldData.pages) {
          if (deleteComment(page, commentId)) {
            return clonedOldData;
          }
        }

        return clonedOldData;
      });
    },
    [queryKey, client]
  );

  const handleCommentSubmitted = useCallback<OnSubmitSuccessFunction>(
    (
      response: SignCommentResponseClientSchemaType | undefined,
      {
        txHash,
        chainId,
      }: {
        txHash: Hex;
        chainId: number;
      }
    ) => {
      if (!response) {
        return refetch();
      }

      client.setQueryData<typeof data>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        const clonedOldData = structuredClone(oldData);

        clonedOldData.pages[0].results.unshift({
          ...response.data,
          deletedAt: null,
          logIndex: 0,
          txHash,
          chainId,
          timestamp: new Date(),
          replies: {
            results: [],
            pagination: {
              hasMore: false,
              limit: 0,
              offset: 0,
            },
          },
        });

        return clonedOldData;
      });
    },
    [queryKey, client, refetch]
  );

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
      <h2 className="text-2xl font-bold mb-4">Comments</h2>
      <div className="mb-4">
        {account.address ? (
          <CommentForm onSubmitSuccess={handleCommentSubmitted} />
        ) : (
          <ConnectButton />
        )}
      </div>
      {results.map((comment) => (
        <Comment
          comment={comment}
          key={comment.id}
          onDelete={handleCommentDeleted}
        />
      ))}
      {hasNextPage && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => fetchNextPage()}
        >
          Load More
        </button>
      )}
    </div>
  );
}
