"use client";

import { fetchComments, fetchAppApprovalStatus } from "@ecp.eth/sdk";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { useApproveApp } from "@ecp.eth/sdk/wagmi";
import type { Hex, AppApprovalStatusResponse } from "@ecp.eth/sdk/types";
import { Button } from "@/components/ui/button";
import { COMMENTS_V1_ADDRESS } from "@/lib/addresses";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { CommentGasless } from "./CommentGasless";
import { chains } from "@/lib/wagmi";

interface CommentData {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  replies: CommentData[];
}

export function CommentSectionGasless() {
  const { address } = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [pendingTxHash, setPendingTxHash] = useState<Hex>();

  const {
    writeContract: removeApprovalTx,
    data: removeApprovalTxHash,
    reset: resetApprovalTx,
  } = useWriteContract();

  const getApprovalDataMutation = useMutation({
    mutationFn: async ({ author }: { author: Hex }) => {
      return fetchAppApprovalStatus({
        apiUrl: process.env.NEXT_PUBLIC_URL!,
        author,
      });
    },
  });

  const { approve: approvePostingCommentsOnUsersBehalf } = useApproveApp({
    commentsApiUrl: process.env.NEXT_PUBLIC_URL!,
    chainId: chains[0].id,
  });

  const postApprovalSignatureMutation = useMutation({
    mutationFn: async (request: AppApprovalStatusResponse) => {
      return approvePostingCommentsOnUsersBehalf(request);
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: postApprovalSignatureMutation.data,
    });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", currentUrl, page],
    queryFn: async () => {
      return fetchComments({
        apiUrl: process.env.NEXT_PUBLIC_URL!,
        targetUrl: currentUrl,
        limit: pageSize,
        offset: page * pageSize,
      });
    },
    enabled: !!currentUrl,
  });

  const addReply = (
    comments: CommentData[],
    parentId: string,
    newReply: CommentData
  ): CommentData[] => {
    return comments.map((comment) => {
      if (comment.id === parentId) {
        return { ...comment, replies: [...comment.replies, newReply] };
      } else if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReply(comment.replies, parentId, newReply),
        };
      }
      return comment;
    });
  };

  useEffect(() => {
    if (receipt?.status === "success" && address) {
      getApprovalDataMutation.mutate({ author: address });
      // Need to reset the approval tx here otherwise it will trigger an infinite loop
      resetApprovalTx();
    }
  }, [receipt, address]);

  useEffect(() => {
    if (address) {
      getApprovalDataMutation.mutate({ author: address });
    }
  }, [address]);

  useEffect(() => {
    if (removeApprovalTxHash) {
      setPendingTxHash(removeApprovalTxHash);
    }
  }, [removeApprovalTxHash, setPendingTxHash, pendingTxHash]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const isApprovalPending =
    isReceiptLoading ||
    postApprovalSignatureMutation.isPending ||
    getApprovalDataMutation.isPending;

  const isRemovingApproval = isReceiptLoading && !!removeApprovalTxHash;

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error loading comments: {(error as Error).message}</div>;
  }

  const approvalStatus = getApprovalDataMutation.data;

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Comments</h2>

      {!!approvalStatus && !approvalStatus.approved ? (
        <div className="mb-4">
          <Button
            onClick={() => {
              if (!address) {
                throw new Error("No address found");
              }
              getApprovalDataMutation.mutate(
                {
                  author: address,
                },
                {
                  onSuccess(approvalSigData) {
                    postApprovalSignatureMutation.mutate(approvalSigData, {
                      onSuccess(txHash) {
                        setPendingTxHash(txHash);
                      },
                    });
                  },
                }
              );
            }}
            disabled={isApprovalPending}
            variant="default"
          >
            {isApprovalPending
              ? "Requesting Approval..."
              : "Request Approval to Comment"}
          </Button>
        </div>
      ) : (
        !!approvalStatus &&
        approvalStatus.approved && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              App has approval to post on your behalf.
            </div>
            <Button
              variant="outline"
              disabled={isRemovingApproval}
              onClick={() => {
                removeApprovalTx({
                  abi: CommentsV1Abi,
                  address: COMMENTS_V1_ADDRESS,
                  functionName: "removeApprovalAsAuthor",
                  args: [approvalStatus.appSigner],
                });
              }}
            >
              <X />
              <span>
                {isRemovingApproval ? "Removing..." : "Remove Approval"}
              </span>
            </Button>
          </div>
        )
      )}

      <CommentBoxGasless onSubmit={() => refetch()} />
      {data?.results.map((comment) => (
        <CommentGasless
          key={comment.id}
          author={comment.author}
          content={comment.content}
          id={comment.id}
          timestamp={new Date(comment.timestamp).getTime()}
          replies={comment.replies.map((reply) => ({
            timestamp: new Date(reply.timestamp).getTime(),
            id: reply.id,
            content: reply.content,
            author: reply.author,
          }))}
          onReply={(parentId, content) => refetch()}
          onDelete={(id) => {
            refetch();
          }}
        />
      ))}
      {data?.pagination.hasMore && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => setPage((prev) => prev + 1)}
        >
          Load More
        </button>
      )}
    </div>
  );
}
