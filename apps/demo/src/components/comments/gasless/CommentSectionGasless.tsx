"use client";

import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentGasless } from "./CommentGasless";
import {
  COMMENTS_V1_ADDRESS,
  createApprovalTypedData,
  fetchComments,
} from "@ecp.eth/sdk";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import {
  ChangeApprovalStatusRequestBodySchemaType,
  ChangeApprovalStatusResponseSchema,
} from "@/lib/schemas";
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
import { useApprovalStatus } from "@/hooks/useApprovalStatus";
import { chain } from "@/lib/wagmi";
import { CommentSectionWrapper } from "../CommentSectionWrapper";

export function CommentSectionGasless() {
  const { address: viewer } = useAccount();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(
    () => ["comments", currentUrl, viewer],
    [currentUrl, viewer]
  );

  const removeApprovalContract = useWriteContract();

  const {
    data: approvalData,
    isPending: isApprovalQuerying,
    refetch: refetchApprovalQuery,
  } = useApprovalStatus();

  const approveGaslessTransactionsMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!approvalData || !viewer) {
        throw new Error("No approval data found");
      }

      if (approvalData.approved) {
        throw new Error("Already approved");
      }

      const signTypedDataParams = await createApprovalTypedData({
        author: viewer,
        appSigner: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        chainId: chain.id,
        nonce: approvalData.nonce,
      });

      return {
        signTypedDataParams: {
          ...signTypedDataParams,
          account: viewer,
        },
        variables: approvalData,
      };
    },
    async sendSignedData({ signature, signTypedDataParams }) {
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            signTypedDataParams,
            authorSignature: signature,
          } satisfies ChangeApprovalStatusRequestBodySchemaType,
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
          viewer,
          mode: "flat",
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
        viewer,
        mode: "flat",
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
      <CommentSectionWrapper>
        <h2 className="text-lg font-semibold">Comments</h2>

        {!approvalData?.approved ? (
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
                  if (!approvalData || !approvalData.approved || !viewer) {
                    throw new Error("No data found");
                  }

                  removeApprovalContract.writeContract({
                    abi: CommentsV1Abi,
                    address: COMMENTS_V1_ADDRESS,
                    functionName: "removeApprovalAsAuthor",
                    args: [publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS],
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
            rootComment={comment}
          />
        ))}
        {hasNextPage && (
          <Button onClick={() => fetchNextPage()} variant="secondary" size="sm">
            Load More
          </Button>
        )}
      </CommentSectionWrapper>
    </CommentGaslessProvider>
  );
}
