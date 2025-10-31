"use client";

import z from "zod";
import { Button } from "@/components/ui/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2Icon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { createApprovalTypedData } from "@ecp.eth/sdk/comments";
import {
  useGaslessTransaction,
  useRevokeApproval,
} from "@ecp.eth/sdk/comments/react";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import {
  SendApproveSignerRequestPayloadSchema,
  SendApproveSignerResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/approve";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { publicEnv } from "@/publicEnv";
import {
  COMMENTS_PER_PAGE,
  NEW_COMMENTS_CHECK_INTERVAL,
} from "@/lib/constants";
import {
  useNewCommentsChecker,
  useIsAccountStatusResolved,
  useConnectAccount,
} from "@ecp.eth/shared/hooks";
import type { Hex } from "@ecp.eth/sdk/core/schemas";
import {
  CommentGaslessProvider,
  CommentGaslessProviderContextType,
} from "./CommentGaslessProvider";
import { useApprovalStatus } from "@ecp.eth/shared/hooks/useApprovalStatus";
import { chain } from "@/lib/clientWagmi";
import { CommentSectionWrapper } from "../core/CommentSectionWrapper";
import { useGaslessCommentActions } from "./hooks/useGaslessCommentActions";
import { CommentItem } from "../core/CommentItem";
import { CommentForm } from "../core/CommentForm";
import { createCommentItemsQueryKey } from "../core/queryKeys";
import { CommentActionsProvider } from "./context";
import { toast } from "sonner";
import { useConnectedAction } from "./hooks/useConnectedAction";
import { COMMENT_TYPE_COMMENT } from "@ecp.eth/sdk";
import { Heading2 } from "../core/Heading2";
import { LoadingScreen } from "../core/LoadingScreen";
import { getSignerURL } from "@/lib/utils";
import { SIWELoginProvider } from "./SIWELoginProvider";
import { useSIWEFetch } from "./hooks/useSIWEFetch";

type CommentSectionGaslessProps = {
  disableApprovals?: boolean;
};

export function CommentSectionGasless({
  disableApprovals,
}: CommentSectionGaslessProps) {
  const { address: viewer } = useAccount();
  const connectAccount = useConnectAccount();
  const isAccountStatusResolved = useIsAccountStatusResolved();
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const queryKey = useMemo(
    () => createCommentItemsQueryKey(viewer, currentUrl),
    [currentUrl, viewer],
  );

  const revokeApproval = useRevokeApproval();
  const approvalStatus = useApprovalStatus(
    publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chain,
  );
  const fetch = useSIWEFetch();

  const approveGaslessTransactionsMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      const approvalData = approvalStatus.data;

      if (!approvalData || !viewer) {
        throw new Error("No approval data found");
      }

      if (approvalData.approved) {
        throw new Error("Already approved");
      }

      const signTypedDataParams = createApprovalTypedData({
        author: viewer,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
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
      if (!viewer) {
        throw new Error("No viewer address found");
      }

      const response = await fetch(getSignerURL("/api/approve-signer/send"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            signTypedDataParams,
            authorSignature: signature,
            authorAddress: viewer,
            chainId: chain.id,
          } satisfies z.infer<typeof SendApproveSignerRequestPayloadSchema>,
          bigintReplacer, // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to post approval signature, the service is temporarily unavailable, please try again later",
        );
      }

      return SendApproveSignerResponseBodySchema.parse(await response.json())
        .txHash;
    },
  });

  const { request: requestApprovalOnConnect } = useConnectedAction(() => {
    approveGaslessTransactionsMutation.mutate();
  });

  const approveContractReceipt = useWaitForTransactionReceipt({
    hash: approveGaslessTransactionsMutation.data,
  });

  const removeApprovalContractReceipt = useWaitForTransactionReceipt({
    hash: revokeApproval.data?.txHash,
  });

  const {
    data,
    isSuccess,
    error,
    hasNextPage,
    fetchNextPage,
    isPending,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    enabled: isAccountStatusResolved && !!currentUrl,
    queryKey,
    initialPageParam: {
      cursor: undefined as Hex | undefined,
      limit: COMMENTS_PER_PAGE,
    },
    queryFn: ({ pageParam, signal }) => {
      return fetchComments({
        chainId: chain.id,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        cursor: pageParam.cursor,
        limit: pageParam.limit,
        signal,
        viewer,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
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
    enabled: isAccountStatusResolved && !!currentUrl,
    queryData: data,
    queryKey,
    refetch,
    fetchComments({ cursor, signal }) {
      return fetchComments({
        chainId: chain.id,
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        targetUri: currentUrl,
        limit: COMMENTS_PER_PAGE,
        cursor,
        sort: "asc",
        signal,
        viewer,
        mode: "flat",
        commentType: COMMENT_TYPE_COMMENT,
      });
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const gaslessCommentActions = useGaslessCommentActions({
    connectedAddress: viewer,
    gasSponsorship:
      !disableApprovals && !!approvalStatus.data?.approved
        ? "gasless-preapproved"
        : "gasless-not-preapproved",
  });

  useEffect(() => {
    if (approveContractReceipt.data?.status === "success") {
      approvalStatus.refetch();
      approveGaslessTransactionsMutation.reset();
      revokeApproval.reset();
    }
  }, [
    approvalStatus,
    approveContractReceipt.data?.status,
    approveGaslessTransactionsMutation,
    revokeApproval,
  ]);

  useEffect(() => {
    if (removeApprovalContractReceipt.data?.status === "success") {
      approvalStatus.refetch();
      approveGaslessTransactionsMutation.reset();
      revokeApproval.reset();
    }
  }, [
    approvalStatus,
    removeApprovalContractReceipt.data?.status,
    approveGaslessTransactionsMutation,
    revokeApproval,
  ]);

  useEffect(() => {
    if (!approveGaslessTransactionsMutation.error) {
      return;
    }

    toast.error(approveGaslessTransactionsMutation.error.message);
  }, [approveGaslessTransactionsMutation.error]);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const commentGaslessProviderValue =
    useMemo<CommentGaslessProviderContextType>(
      () => ({
        isApproved:
          !disableApprovals && (approvalStatus.data?.approved ?? false),
        areApprovalsEnabled: !disableApprovals,
      }),
      [approvalStatus.data?.approved, disableApprovals],
    );

  const isApprovalPending =
    (approveContractReceipt.isLoading ||
      approveGaslessTransactionsMutation.isPending ||
      approvalStatus.isPending) &&
    !!viewer;

  const isRemovingApproval =
    revokeApproval.isPending || removeApprovalContractReceipt.isLoading;

  const results = useMemo(() => {
    return data?.pages.flatMap((page) => page.results) ?? [];
  }, [data]);

  return (
    <CommentActionsProvider value={gaslessCommentActions}>
      <CommentGaslessProvider value={commentGaslessProviderValue}>
        <SIWELoginProvider>
          <CommentSectionWrapper>
            <Heading2>Comments</Heading2>

            {!approvalStatus.data?.approved &&
              commentGaslessProviderValue.areApprovalsEnabled && (
                <div className="mb-4">
                  <Button
                    onClick={async () => {
                      if (!viewer) {
                        await connectAccount();
                        requestApprovalOnConnect();
                        return;
                      }

                      approveGaslessTransactionsMutation.mutate();
                    }}
                    disabled={isApprovalPending}
                    variant="default"
                  >
                    {isApprovalPending
                      ? "Requesting Approval..."
                      : "Allow this app to post on your behalf"}
                  </Button>
                </div>
              )}
            {!!viewer &&
              approvalStatus.data?.approved &&
              commentGaslessProviderValue.areApprovalsEnabled && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">
                    App has approval to post on your behalf.
                  </div>
                  <Button
                    variant="outline"
                    disabled={!approvalStatus.data || isRemovingApproval}
                    onClick={() => {
                      if (
                        !approvalStatus.data ||
                        !approvalStatus.data.approved ||
                        !viewer
                      ) {
                        throw new Error("No data found");
                      }

                      revokeApproval.mutateAsync({
                        app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
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
            <CommentForm queryKey={queryKey} />
            {isPending && <LoadingScreen />}
            {error && (
              <div>Error loading comments: {(error as Error).message}</div>
            )}
            {isSuccess && (
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
                {results.map((comment) => (
                  <CommentItem
                    key={`${comment.id}-${comment.deletedAt}`}
                    comment={comment}
                  />
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
                        <Loader2Icon className="animate-spin h-4 w-4" />{" "}
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                )}
              </>
            )}
          </CommentSectionWrapper>
        </SIWELoginProvider>
      </CommentGaslessProvider>
    </CommentActionsProvider>
  );
}
