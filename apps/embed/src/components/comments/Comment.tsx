"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentForm, OnSubmitSuccessFunction } from "./CommentForm";
import { formatDate } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { getAddress } from "viem";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import {
  CommentPageSchema,
  SignCommentResponseClientSchemaType,
  type Comment as CommentType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

const REPLIES_PER_PAGE = 10;

interface CommentProps {
  comment: CommentType;
  onDelete?: (id: Hex) => void;
}

export function Comment({ comment, onDelete }: CommentProps) {
  const onDeleteRef = useFreshRef(onDelete);
  /**
   * Prevents infinite cycle when delete comment transaction succeeded
   * because comment is updated to be redacted
   */
  const commentRef = useFreshRef(comment);
  const client = useQueryClient();
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const queryKey = useMemo(() => ["comments", comment.id], [comment.id]);

  const repliesQuery = useInfiniteQuery({
    queryKey,
    initialData: {
      pages: [comment.replies],
      pageParams: [
        {
          offset: comment.replies.pagination.offset,
          limit: comment.replies.pagination.limit,
        },
      ],
    },
    initialPageParam: {
      offset: comment.replies.pagination.offset,
      limit: comment.replies.pagination.limit,
    },
    staleTime: 5000, // do not load the data on first mount
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ pageParam, signal }) => {
      const searchParams = new URLSearchParams({
        offset: pageParam.offset.toString(),
        limit: REPLIES_PER_PAGE.toString(),
      });

      const response = await fetch(
        `/api/comments/${comment.id}/replies?${searchParams.toString()}`,
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

  const replies = useMemo(() => {
    return repliesQuery.data.pages.flatMap((page) => page.results);
  }, [repliesQuery.data.pages]);

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
      setIsReplying(false);

      if (!response) {
        return repliesQuery.refetch();
      }

      client.setQueryData<typeof repliesQuery.data>(queryKey, (oldData) => {
        if (!oldData) {
          return oldData;
        }

        const clonedOldData = structuredClone(oldData);

        clonedOldData.pages[0].results.unshift({
          ...response.data,
          author: {
            address: response.data.author,
          },
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
    [client, queryKey, repliesQuery]
  );

  const deleteCommentContract = useWriteContract();

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash: deleteCommentContract.data,
  });

  useEffect(() => {
    if (deleteCommentTransactionReceipt.data?.status === "success") {
      onDeleteRef.current?.(commentRef.current.id);
    }
  }, [deleteCommentTransactionReceipt.data?.status, commentRef, onDeleteRef]);

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const isDeleting =
    deleteCommentTransactionReceipt.isFetching ||
    deleteCommentContract.isPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 mb-1">
          {comment.author?.ens?.name ??
            comment.author?.address ??
            "Unknown sender"}{" "}
          • {formatDate(comment.timestamp)}
        </div>
        {isAuthor && !comment.deletedAt && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => {
                  deleteCommentContract.writeContract({
                    address: COMMENTS_V1_ADDRESS,
                    abi: CommentsV1Abi,
                    functionName: "deleteCommentAsAuthor",
                    args: [comment.id],
                  });
                }}
                disabled={isDeleting}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mb-2">{comment.content}</div>
      <div className="text-xs text-gray-500 mb-2">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="mr-2 hover:underline"
        >
          reply
        </button>
      </div>
      {isReplying && (
        <CommentForm
          onLeftEmpty={() => setIsReplying(false)}
          onSubmitSuccess={handleCommentSubmitted}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
      {replies.map((reply) => (
        <Comment key={reply.id} comment={reply} onDelete={onDelete} />
      ))}
      {repliesQuery.hasNextPage && (
        <div className="text-xs text-gray-500 mb-2">
          <button
            onClick={() => repliesQuery.fetchNextPage()}
            className="mr-2 hover:underline"
          >
            show more replies
          </button>
        </div>
      )}
    </div>
  );
}
