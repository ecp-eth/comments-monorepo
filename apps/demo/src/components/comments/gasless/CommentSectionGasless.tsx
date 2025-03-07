"use client";

import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { CommentGasless } from "./CommentGasless";
import { COMMENTS_V1_ADDRESS, fetchComments } from "@ecp.eth/sdk";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import {
  ChangeApprovalStatusResponseSchema,
  GetApprovalStatusSchema,
} from "@/lib/schemas";
import type { SignTypedDataParameters } from "viem";
import { bigintReplacer } from "@/lib/utils";
import { publicEnv } from "@/publicEnv";

export function CommentSectionGasless() {
  const { address } = useAccount();
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [currentUrl, setCurrentUrl] = useState<string>("");

  const removeApprovalContract = useWriteContract();

  const getApprovalQuery = useQuery({
    enabled: !!address,
    queryKey: ["approval", address],
    queryFn: async () => {
      if (!address) {
        throw new Error("No address found");
      }

      const response = await fetch(`/api/approval?author=${address}`);

      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }

      return GetApprovalStatusSchema.parse(await response.json());
    },
  });

  const approveGaslessTransactionsMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!getApprovalQuery.data) {
        throw new Error("No approval data found");
      }

      if (getApprovalQuery.data.approved) {
        throw new Error("Already approved");
      }

      return {
        signTypedDataParams: getApprovalQuery.data
          .signTypedDataParams as unknown as SignTypedDataParameters,
        variables: getApprovalQuery.data,
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      return ChangeApprovalStatusResponseSchema.parse(await response.json())
        .txHash;
    },
  });

  const approveContractReceipt = useWaitForTransactionReceipt({
    hash: approveGaslessTransactionsMutation.data,
  });

  const removeApprovalContractReceipt = useWaitForTransactionReceipt({
    hash: removeApprovalContract.data,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["comments", currentUrl, page],
    queryFn: () => {
      return fetchComments({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        offset: page * pageSize,
        limit: pageSize,
      });
    },
    enabled: !!currentUrl,
  });

  const { refetch: refetchApprovalQuery } = getApprovalQuery;
  const { reset: resetApproveGaslessTransactionsMutation } =
    approveGaslessTransactionsMutation;
  const { reset: resetRemoveApprovalContract } = removeApprovalContract;

  useEffect(() => {
    if (approveContractReceipt.data?.status === "success") {
      refetchApprovalQuery();
      resetApproveGaslessTransactionsMutation();
      removeApprovalContract.reset();
    }
  }, [
    approveContractReceipt.data?.status,
    refetchApprovalQuery,
    removeApprovalContract,
    resetApproveGaslessTransactionsMutation,
  ]);

  useEffect(() => {
    if (removeApprovalContractReceipt.data?.status === "success") {
      refetchApprovalQuery();
      resetApproveGaslessTransactionsMutation();
      resetRemoveApprovalContract();
    }
  }, [
    refetchApprovalQuery,
    removeApprovalContractReceipt.data?.status,
    resetApproveGaslessTransactionsMutation,
    resetRemoveApprovalContract,
  ]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const isApprovalPending =
    approveContractReceipt.isLoading ||
    approveGaslessTransactionsMutation.isPending ||
    getApprovalQuery.isPending;

  const isRemovingApproval =
    removeApprovalContract.isPending || removeApprovalContractReceipt.isLoading;

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error loading comments: {(error as Error).message}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Comments</h2>

      {!getApprovalQuery.data?.approved &&
      getApprovalQuery.data?.signTypedDataParams ? (
        <div className="mb-4">
          <Button
            onClick={() => {
              approveGaslessTransactionsMutation.mutate();
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
        getApprovalQuery.data?.approved && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              App has approval to post on your behalf.
            </div>
            <Button
              variant="outline"
              disabled={!getApprovalQuery.data || isRemovingApproval}
              onClick={() => {
                if (
                  !getApprovalQuery.data ||
                  !getApprovalQuery.data.approved ||
                  !address
                ) {
                  throw new Error("No data found");
                }

                removeApprovalContract.writeContract({
                  abi: CommentsV1Abi,
                  address: COMMENTS_V1_ADDRESS,
                  functionName: "removeApprovalAsAuthor",
                  args: [getApprovalQuery.data.appSigner],
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

      <CommentBoxGasless
        onSubmit={() => refetch()}
        isApproved={getApprovalQuery.data?.approved}
      />
      {data?.results.map((comment) => (
        <CommentGasless
          key={comment.id}
          comment={comment}
          onReply={() => refetch()}
          onDelete={() => {
            refetch();
          }}
          submitIfApproved={getApprovalQuery.data?.approved ?? false}
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
