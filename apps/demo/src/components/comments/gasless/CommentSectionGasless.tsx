"use client";

import { fetchComments } from "@ecp.eth/sdk";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { Button } from "@/components/ui/button";
import { COMMENTS_V1_ADDRESS } from "@/lib/addresses";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { signTypedData } from "viem/accounts";
import {
  useAccount,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { CommentGasless } from "./CommentGasless";

interface CommentData {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  replies: CommentData[];
}

interface ApprovalResponse {
  approved: boolean;
  signTypedDataArgs: Parameters<typeof signTypedData>[0];
  appSignature: `0x${string}`;
  appSigner: `0x${string}`;
}

interface SignApprovalRequest {
  signTypedDataArgs: Parameters<typeof signTypedData>[0];
  appSignature: `0x${string}`;
  authorSignature: `0x${string}`;
}

export function CommentSectionGasless() {
  const { address } = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();

  const {
    writeContract: removeApprovalTx,
    data: removeApprovalTxHash,
    reset: resetApprovalTx,
  } = useWriteContract();

  const getApprovalDataMutation = useMutation({
    mutationFn: async ({
      author,
    }: {
      author: `0x${string}`;
    }): Promise<ApprovalResponse> => {
      setPendingTxHash(undefined);

      if (!address) {
        throw new Error("No address found");
      }

      const response = await fetch(`/api/approval?author=${author}`);
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }
      return response.json();
    },
  });

  const { signTypedData: signApproval, isPending: isSigningApproval } =
    useSignTypedData();

  const postApprovalSignatureMutation = useMutation({
    mutationFn: async (
      data: SignApprovalRequest
    ): Promise<{ txHash: `0x${string}` }> => {
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      return response.json();
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
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
    isSigningApproval ||
    isReceiptLoading ||
    postApprovalSignatureMutation.isPending ||
    getApprovalDataMutation.isPending;

  const isRemovingApproval = isReceiptLoading && !!removeApprovalTxHash;

  if (isLoading) return <div>Loading comments...</div>;
  if (error)
    return <div>Error loading comments: {(error as Error).message}</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Comments</h2>

      {!getApprovalDataMutation.data?.approved &&
      getApprovalDataMutation.data?.signTypedDataArgs ? (
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
                    signApproval(approvalSigData.signTypedDataArgs, {
                      onSuccess(signature) {
                        postApprovalSignatureMutation.mutate(
                          {
                            signTypedDataArgs:
                              approvalSigData?.signTypedDataArgs,
                            appSignature: approvalSigData?.appSignature,
                            authorSignature: signature,
                          },
                          {
                            onSuccess(data) {
                              setPendingTxHash(data.txHash);
                            },
                          }
                        );
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
        getApprovalDataMutation.data?.approved && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              App has approval to post on your behalf.
            </div>
            <Button
              variant="outline"
              disabled={!getApprovalDataMutation.data || isRemovingApproval}
              onClick={() => {
                if (
                  !getApprovalDataMutation.data ||
                  !getApprovalDataMutation.data.appSigner ||
                  !address
                ) {
                  throw new Error("No data found");
                }

                removeApprovalTx({
                  abi: CommentsV1Abi,
                  address: COMMENTS_V1_ADDRESS,
                  functionName: "removeApprovalAsAuthor",
                  args: [getApprovalDataMutation.data.appSigner],
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
