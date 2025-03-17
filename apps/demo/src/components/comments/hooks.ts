import {
  BadRequestResponseSchema,
  CommentPageSchemaType,
  GaslessPostCommentResponseSchema,
  GaslessPostCommentResponseSchemaType,
  ListCommentsQueryDataSchema,
  PendingCommentOperationSchemaType,
  PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  type ListCommentsQueryDataSchemaType,
} from "@/lib/schemas";
import {
  InfiniteData,
  type QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import {
  hasNewComments,
  insertPendingCommentToPage,
  markCommentAsDeleted,
  mergeNewComments,
  replaceCommentPendingOperationByComment,
} from "./helpers";
import {
  OnDeleteComment,
  OnSubmitCommentSuccessFunction,
  OnRetryPostComment,
} from "./types";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { useConnectAccount } from "@/hooks/useConnectAccount";
import { prepareSignedGaslessComment } from "./queries";
import { bigintReplacer } from "@/lib/utils";
import { InvalidCommentError, RateLimitedError } from "./errors";
import type { Hex, SignTypedDataParameters } from "viem";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { publicEnv } from "@/publicEnv";
import {
  IndexerAPIAuthorDataSchemaType,
  IndexerAPIListCommentRepliesSchemaType,
  IndexerAPIListCommentsSchemaType,
} from "@ecp.eth/sdk/schemas";
import { NEW_COMMENTS_CHECK_INTERVAL } from "@/lib/constants";

/**
 * This hook checks whether there are any new comments on the query given by the `queryKey`.
 * If there are new comments, it updates the first page pagination info so UI can react to them.
 */
export function useNewCommentsChecker({
  queryKey,
  queryData,
  fetchComments: fetchFn,
}: {
  /**
   * Query to update the first page pagination.
   */
  queryKey: QueryKey;
  queryData: InfiniteData<CommentPageSchemaType> | undefined;
  fetchComments: (options: {
    cursor: Hex | undefined;
    signal: AbortSignal;
  }) => Promise<
    IndexerAPIListCommentsSchemaType | IndexerAPIListCommentRepliesSchemaType
  >;
}): {
  hasNewComments: boolean;
  fetchNewComments: () => void;
} {
  const client = useQueryClient();
  const newCommentsQueryKey = useMemo(() => {
    return [...queryKey, "new-comments-checker"];
  }, [queryKey]);

  const queryResult = useQuery({
    enabled: !!queryData,
    queryKey: newCommentsQueryKey,
    queryFn: async ({ signal }) => {
      if (!queryData) {
        return;
      }

      const response = await fetchFn({
        cursor: queryData.pages[0].pagination.startCursor,
        signal,
      });

      return response;
    },
    refetchInterval: NEW_COMMENTS_CHECK_INTERVAL,
  });

  const resetQuery = useCallback(() => {
    client.setQueryData<IndexerAPIListCommentsSchemaType>(
      newCommentsQueryKey,
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return {
          results: [],
          pagination: {
            hasNext: false,
            hasPrevious: false,
            limit: 1,
          },
        };
      }
    );
  }, [client, newCommentsQueryKey]);

  useEffect(() => {
    if (!queryResult.data || !queryData) {
      return;
    }

    const newComments = queryResult.data;

    // this also has new comments (not written by us, so let user decide if they want to see them, see fetchNewComments())
    if (hasNewComments(queryData, queryResult.data)) {
      return;
    }

    // remove pending operations and make sure the order of new comments is correct
    // based on indexer result
    client.setQueryData<ListCommentsQueryDataSchemaType>(
      queryKey,
      (oldData) => {
        if (!oldData) {
          return oldData;
        }

        return mergeNewComments(oldData, newComments);
      }
    );

    resetQuery();
  }, [queryResult.data, queryData, resetQuery, client, queryKey]);

  const fetchNewComments = useCallback(() => {
    if (!queryData || !queryResult.data) {
      return;
    }

    const newComments = queryResult.data;

    client.setQueryData<ListCommentsQueryDataSchemaType>(
      queryKey,
      (oldData) => {
        if (!oldData) {
          return;
        }

        return mergeNewComments(oldData, newComments);
      }
    );

    resetQuery();
  }, [queryData, queryResult.data, client, queryKey, resetQuery]);

  return useMemo(() => {
    return {
      hasNewComments:
        queryData && queryResult.data
          ? hasNewComments(queryData, queryResult.data)
          : false,
      fetchNewComments,
    };
  }, [queryData, queryResult.data, fetchNewComments]);
}

export function useHandleCommentDeleted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnDeleteComment {
  const client = useQueryClient();

  return useCallback(
    (commentId) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return markCommentAsDeleted(queryData, commentId);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleCommentSubmitted({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnSubmitCommentSuccessFunction {
  const client = useQueryClient();

  return useCallback(
    (pendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return insertPendingCommentToPage(queryData, pendingOperation);
        }
      );
    },
    [client, queryKey]
  );
}

export function useHandleRetryPostComment({
  queryKey,
}: {
  queryKey: QueryKey;
}): OnRetryPostComment {
  const client = useQueryClient();

  return useCallback(
    (comment, newPendingOperation) => {
      client.setQueryData<ListCommentsQueryDataSchemaType | undefined>(
        queryKey,
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          const queryData = ListCommentsQueryDataSchema.parse(oldData);

          return replaceCommentPendingOperationByComment(
            queryData,
            comment,
            newPendingOperation
          );
        }
      );
    },
    [client, queryKey]
  );
}

type SubmitGaslessCommentVariables = {
  isApproved: boolean;
  content: string;
  parentId?: Hex;
  targetUri: string;
};

type SubmitGaslessCommentVariablesInternal = {
  author: Hex;
  content: string;
  parentId?: Hex;
  targetUri: string;
};

type PostPriorNotApprovedResult = GaslessPostCommentResponseSchemaType &
  PreparedSignedGaslessPostCommentNotApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export function useSubmitGaslessComment(
  options?: UseMutationOptions<
    PendingCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >
) {
  const connectAccount = useConnectAccount();

  // post a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const postPriorApprovedCommentMutation = useMutation({
    mutationFn: async (variables: SubmitGaslessCommentVariablesInternal) => {
      return prepareSignedGaslessComment(
        // tell the server to submit right away after preparation of the comment data,
        // if the app is previously approved
        true,
        variables
      );
    },
  });

  // post a comment that was previously NOT approved,
  // will require user interaction for signature
  const postPriorNotApprovedSubmitMutation = useGaslessTransaction<
    PreparedSignedGaslessPostCommentNotApprovedSchemaType,
    PostPriorNotApprovedResult,
    SubmitGaslessCommentVariablesInternal
  >({
    async prepareSignTypedDataParams(variables) {
      const data = await prepareSignedGaslessComment(false, variables);

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessPostCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/sign-comment/gasless", {
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
        if (response.status === 429) {
          throw new RateLimitedError();
        }

        if (response.status === 400) {
          throw new InvalidCommentError(
            BadRequestResponseSchema.parse(await response.json())
          );
        }

        throw new Error("Failed to post comment");
      }

      const { txHash } = GaslessPostCommentResponseSchema.parse(
        await response.json()
      );

      return {
        txHash,
        ...variables,
      };
    },
  });

  return useMutation<
    PendingCommentOperationSchemaType,
    Error,
    SubmitGaslessCommentVariables
  >({
    ...options,
    mutationFn: async ({
      isApproved,
      ...variables
    }: SubmitGaslessCommentVariables) => {
      const address = await connectAccount();

      const resolvedAuthor = await fetchAuthorData({
        apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
        address,
      }).catch((e) => {
        console.error(e);
        return undefined;
      });

      if (isApproved) {
        const result = await postPriorApprovedCommentMutation.mutateAsync({
          ...variables,
          author: address,
        });

        return {
          chainId: result.chainId,
          response: {
            data: result.commentData,
            hash: result.txHash,
            signature: result.appSignature,
          },
          txHash: result.txHash,
          resolvedAuthor,
          type: "gasless-preapproved",
        };
      }

      const result = await postPriorNotApprovedSubmitMutation.mutateAsync({
        ...variables,
        author: address,
      });

      return {
        chainId: result.chainId,
        response: {
          data: result.commentData,
          hash: result.txHash,
          signature: result.appSignature,
        },
        txHash: result.txHash,
        resolvedAuthor,
        type: "gasless-not-approved",
      };
    },
  });
}
