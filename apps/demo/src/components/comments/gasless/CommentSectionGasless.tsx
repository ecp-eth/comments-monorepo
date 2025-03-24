"use client";

import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentGasless } from "./CommentGasless";
import { COMMENTS_V1_ADDRESS, fetchComments } from "@ecp.eth/sdk";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import {
  ChangeApprovalStatusResponseSchema,
  GetApprovalStatusSchema,
} from "@/lib/schemas";
import type { SignTypedDataParameters } from "viem";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { publicEnv } from "@/publicEnv";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import {
  useHandleCommentDeleted,
  useHandleCommentSubmitted,
  useHandleRetryPostComment,
  useNewCommentsChecker,
} from "@ecp.eth/shared/hooks";
import type { Hex } from "@ecp.eth/sdk/schemas";
import {
  CommentGaslessProvider,
  CommentGaslessProviderContextType,
} from "./CommentGaslessProvider";
import { CommentGaslessForm } from "./CommentGaslessForm";

export function CommentSectionGasless() {
  const { address: connectedAddress } = useAccount();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(() => ["comments", currentUrl], [currentUrl]);

  const removeApprovalContract = useWriteContract();

  const {
    data: approvalData,
    isPending: isApprovalQuerying,
    refetch: refetchApprovalQuery,
  } = useQuery({
    enabled: !!connectedAddress,
    queryKey: ["approval", connectedAddress],
    queryFn: async () => {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      const response = await fetch(`/api/approval?author=${connectedAddress}`);

      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }

      return GetApprovalStatusSchema.parse(await response.json());
    },
  });

  const approveGaslessTransactionsMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!approvalData) {
        throw new Error("No approval data found");
      }

      if (approvalData.approved) {
        throw new Error("Already approved");
      }

      return {
        signTypedDataParams:
          approvalData.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: approvalData,
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

  const { data, isLoading, error, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      initialPageParam: {
        cursor: undefined as Hex | undefined,
        limit: COMMENTS_PER_PAGE,
      },
      queryFn: ({ pageParam, signal }) => {
        return fetchComments({
          apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
          appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
          targetUri: currentUrl,
          cursor: pageParam.cursor,
          limit: pageParam.limit,
          signal,
        });
      },
      enabled: !!currentUrl,
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
    queryData: data,
    queryKey,
    fetchComments({ cursor, signal }) {
      return fetchComments({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        limit: COMMENTS_PER_PAGE,
        cursor,
        sort: "asc",
        signal,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const handleCommentDeleted = useHandleCommentDeleted({
    queryKey,
  });
  const handleCommentSubmitted = useHandleCommentSubmitted({
    queryKey,
  });
  const handleRetryPostComment = useHandleRetryPostComment({ queryKey });

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

  const commentGaslessProviderValue =
    useMemo<CommentGaslessProviderContextType>(
      () => ({
        isApproved: approvalData?.approved ?? false,
      }),
      [approvalData?.approved]
    );

  const isApprovalPending =
    approveContractReceipt.isLoading ||
    approveGaslessTransactionsMutation.isPending ||
    isApprovalQuerying;

  const isRemovingApproval =
    removeApprovalContract.isPending || removeApprovalContractReceipt.isLoading;

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  if (error) {
    return <div>Error loading comments: {(error as Error).message}</div>;
  }

  return (
    <CommentGaslessProvider value={commentGaslessProviderValue}>
      <div className="max-w-2xl mx-auto mt-8 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Comments</h2>

        {!approvalData?.approved && approvalData?.signTypedDataParams ? (
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
          approvalData?.approved && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500">
                App has approval to post on your behalf.
              </div>
              <Button
                variant="outline"
                disabled={!approvalData || isRemovingApproval}
                onClick={() => {
                  if (
                    !approvalData ||
                    !approvalData.approved ||
                    !connectedAddress
                  ) {
                    throw new Error("No data found");
                  }

                  removeApprovalContract.writeContract({
                    abi: CommentsV1Abi,
                    address: COMMENTS_V1_ADDRESS,
                    functionName: "removeApprovalAsAuthor",
                    args: [approvalData.appSigner],
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
        <CommentGaslessForm onSubmitSuccess={handleCommentSubmitted} />
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
          <CommentGasless
            key={`${comment.id}-${comment.deletedAt}`}
            comment={comment}
            onRetryPost={handleRetryPostComment}
            onDelete={handleCommentDeleted}
          />
        ))}
        {hasNextPage && (
          <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
            Load More
          </Button>
        )}
      </div>
    </CommentGaslessProvider>
  );
}
