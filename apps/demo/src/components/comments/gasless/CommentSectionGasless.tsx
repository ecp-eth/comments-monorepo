"use client";

import { useApproveApp, useRemoveApproval } from "@ecp.eth/sdk/wagmi";
import type { Hex } from "@ecp.eth/sdk/types";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { CommentGasless } from "./CommentGasless";
import {
  approvePostingCommentsOnUsersBehalf,
  fetchAppApprovalStatus,
  fetchComments,
} from "@/lib/operations";

export function CommentSectionGasless() {
  const { address } = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const approveAppMutation = useApproveApp({
    postApproval(approval, authorSignature) {
      return approvePostingCommentsOnUsersBehalf({
        authorSignature,
        statusResponse: approval,
      });
    },
  });

  const removeApprovalMutation = useRemoveApproval();

  const getApprovalDataMutation = useMutation({
    mutationFn: async ({ author }: { author: Hex }) => {
      return fetchAppApprovalStatus({
        author,
      });
    },
  });

  const approveAppReceipt = useWaitForTransactionReceipt({
    hash: approveAppMutation.data,
  });

  const rejectAppReceipt = useWaitForTransactionReceipt({
    hash: removeApprovalMutation.data,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", currentUrl, page],
    queryFn: async () => {
      return fetchComments({
        targetUri: currentUrl,
        limit: pageSize,
        offset: page * pageSize,
      });
    },
    enabled: !!currentUrl,
  });

  useEffect(() => {
    if (
      address &&
      (approveAppReceipt.data?.status === "success" ||
        rejectAppReceipt.data?.status === "success")
    ) {
      getApprovalDataMutation.mutate({ author: address });
    }
  }, [address, approveAppReceipt.data?.status, rejectAppReceipt.data?.status]);

  useEffect(() => {
    if (address) {
      getApprovalDataMutation.mutate({ author: address });
    }
  }, [address]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const isApprovalPending =
    approveAppReceipt.isLoading ||
    approveAppMutation.isPending ||
    getApprovalDataMutation.isPending;

  const isRemovingApproval =
    rejectAppReceipt.isLoading || removeApprovalMutation.isPending;

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

      {!!approvalStatus && !approvalStatus.approved && (
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
                    if (!approvalSigData.approved) {
                      approveAppMutation.mutate(approvalSigData);
                    }
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
      )}

      {!!approvalStatus && approvalStatus.approved && (
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500">
            App has approval to post on your behalf.
          </div>
          <Button
            variant="outline"
            disabled={isRemovingApproval}
            onClick={() => {
              removeApprovalMutation.mutate({
                appSigner: approvalStatus.appSigner,
              });
            }}
          >
            <X />
            <span>
              {isRemovingApproval ? "Removing..." : "Remove Approval"}
            </span>
          </Button>
        </div>
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
